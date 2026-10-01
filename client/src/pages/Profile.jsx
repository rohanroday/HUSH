import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import ProductCard, { formatPrice } from "../components/ProductCard";
import { useWishlist } from "../context/WishlistContext";
import { useProducts } from "../context/ProductsContext";
import { StatusBadge, StatusTracker } from "../components/OrderStatus";

const SIDEBAR = [
  { key: "orders", label: "My Orders" },
  { key: "profile", label: "My Profile" },
  { key: "wishlist", label: "Wishlist" },
  { key: "settings", label: "Settings" },
];

const ORDER_TABS = ["All", "PLACED", "SHIPPED", "DELIVERED", "CANCELLED"];

export default function Profile() {
  const { user, loading, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = SIDEBAR.some((s) => s.key === searchParams.get("tab")) ? searchParams.get("tab") : "orders";

  if (loading) {
    return <p className="px-4 py-24 text-center text-sm text-stone">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Sign in to view your account</h1>
        <Link
          to="/login"
          state={{ from: "/profile" }}
          className="mt-6 inline-block bg-ink px-6 py-3 text-sm font-semibold text-cream hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display mb-8 text-3xl font-extrabold text-ink">My account</h1>
      <div className="grid gap-10 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1 border border-line p-2 h-fit">
          {SIDEBAR.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSearchParams({ tab: item.key })}
              className={`block w-full px-4 py-2.5 text-left text-sm ${
                tab === item.key ? "bg-ink text-cream" : "text-ink hover:bg-cream-dark"
              }`}
            >
              {item.label}
            </button>
          ))}
          {user.role === "seller" && (
            <Link to="/seller" className="block w-full px-4 py-2.5 text-left text-sm font-medium text-clay hover:bg-cream-dark">
              Seller dashboard →
            </Link>
          )}
          <button
            type="button"
            onClick={logout}
            className="block w-full px-4 py-2.5 text-left text-sm text-stone hover:bg-cream-dark hover:text-ink"
          >
            Logout
          </button>
        </aside>

        <div>
          {tab === "profile" && <ProfilePanel user={user} />}
          {tab === "orders" && <OrdersPanel />}
          {tab === "wishlist" && <WishlistPanel />}
          {tab === "settings" && <SettingsPanel />}
        </div>
      </div>
    </div>
  );
}

function ProfilePanel({ user }) {
  return (
    <div className="border border-line p-6">
      <h2 className="text-sm font-semibold text-ink">Profile details</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between border-b border-line pb-3">
          <dt className="text-stone">Name</dt>
          <dd className="text-ink">{user?.name}</dd>
        </div>
        <div className="flex justify-between border-b border-line pb-3">
          <dt className="text-stone">Email</dt>
          <dd className="text-ink">{user?.email}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone">Account type</dt>
          <dd className="text-ink capitalize">{user?.role}</dd>
        </div>
      </dl>
    </div>
  );
}

function OrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.getOrders();
      setOrders(res.data.orders);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    statusFilter === "All"
      ? orders
      : statusFilter === "PLACED"
        ? orders.filter((o) => ["PLACED", "PENDING"].includes(o.status))
        : orders.filter((o) => o.status === statusFilter);

  const stats = [
    { label: "Total orders", value: orders.length },
    { label: "In progress", value: orders.filter((o) => ["PLACED", "PENDING"].includes(o.status)).length },
    { label: "On the way", value: orders.filter((o) => o.status === "SHIPPED").length },
    { label: "Delivered", value: orders.filter((o) => o.status === "DELIVERED").length },
  ];

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-line p-4">
            <p className="text-xs text-stone">{s.label}</p>
            <p className="font-display mt-1 text-2xl font-extrabold text-ink">{loading ? "–" : s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {ORDER_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setStatusFilter(t)}
            className={`px-3 py-1.5 text-xs font-medium ${
              statusFilter === t ? "bg-ink text-cream" : "border border-line text-ink"
            }`}
          >
            {t === "PLACED" ? "Processing" : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-stone">Loading orders…</p>}

      {notice && (
        <p role="status" className="mb-5 border border-line bg-paper p-4 text-sm text-ink">
          {notice}
        </p>
      )}

      {error && (
        <p className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">Couldn't load orders: {error}</p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="border border-line bg-cream-dark p-8 text-center text-sm text-stone">
          {orders.length === 0 ? "You haven't placed any orders yet." : "No orders with this status."}
          {orders.length === 0 && (
            <Link to="/shop" className="mt-4 block font-medium text-ink underline">
              Start shopping
            </Link>
          )}
        </div>
      )}

      <ul className="space-y-4">
        {filtered.map((order) => (
          <OrderCard key={order._id} order={order} onChanged={load} onNotice={setNotice} />
        ))}
      </ul>
    </div>
  );
}

const PAYMENT_LABELS = {
  PAID: "Paid",
  REFUND_PENDING: "Refund on its way",
  REFUNDED: "Refunded",
};

function CancellationStatus({ request }) {
  const meta = {
    REQUESTED: {
      tone: "border-amber-200 bg-amber-50 text-amber-950",
      title: "Cancellation requested",
      body: "The seller has been notified and will approve or decline it.",
    },
    APPROVED: {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-950",
      title: "Cancellation approved",
      body: "Your refund has been started and usually arrives in 5–7 working days.",
    },
    DECLINED: {
      tone: "border-line bg-paper text-ink",
      title: "Cancellation declined",
      body: "The seller couldn't cancel this order.",
    },
  }[request.status];
  if (!meta) return null;
  return (
    <div className={`mt-5 border p-4 text-sm ${meta.tone}`} role="status">
      <p className="font-semibold">{meta.title}</p>
      <p className="mt-1 text-xs leading-relaxed opacity-80">{meta.body}</p>
      {request.reason && <p className="mt-2 text-xs">Your reason: “{request.reason}”</p>}
      {request.sellerNote && <p className="mt-1 text-xs">Seller's note: “{request.sellerNote}”</p>}
    </div>
  );
}

function OrderCard({ order, onChanged, onNotice }) {
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const canCancel = ["PLACED", "PENDING"].includes(order.status);
  const request = order.cancellationRequest;
  const canRequest = order.status === "SHIPPED" && !request?.status;
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  const sendRequest = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await api.requestCancellation(order._id, reason);
      onNotice?.(res.message);
      setAsking(false);
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };
  const itemCount = order.products.reduce((n, p) => n + p.quantity, 0);

  const paid = order.payment?.status === "PAID";

  const cancel = async () => {
    const question = paid
      ? "Cancel this order? The full amount will be refunded to your original payment method."
      : "Cancel this order?";
    if (!window.confirm(question)) return;
    setCancelling(true);
    setError("");
    try {
      const res = await api.cancelOrder(order._id);
      onNotice?.(res.message);
      await onChanged();
    } catch (err) {
      setError(err.message);
      setCancelling(false);
    }
  };

  return (
    <li className="border border-line p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">Order #{order._id.slice(-6).toUpperCase()}</p>
          <p className="text-xs text-stone">
            {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-5">
        <StatusTracker status={order.status} />
      </div>

      {!open && (
        <div className="mt-5 flex items-center gap-2">
          {order.products.slice(0, 4).map((p, i) => (
            <div key={i} className="h-12 w-10 overflow-hidden bg-cream-dark">
              {p.product?.image && <img src={p.product.image} alt="" className="h-full w-full object-cover" />}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-5 space-y-4 border-t border-line pt-4">
          <ul className="space-y-2">
            {order.products.map((p, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <div className="h-14 w-11 shrink-0 overflow-hidden bg-cream-dark">
                  {p.product?.image && <img src={p.product.image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`/product/${p.product.productId}`} className="truncate text-ink hover:underline">
                    {p.product.title}
                  </Link>
                  <p className="text-xs text-stone">
                    Size {p.size} · Qty {p.quantity}
                  </p>
                </div>
                <p className="text-ink">
                  {formatPrice({ ...p.product.price, amount: p.product.price.amount * p.quantity })}
                </p>
              </li>
            ))}
          </ul>
          <div className="text-sm">
            <p className="text-xs font-medium text-stone">Delivering to</p>
            <p className="mt-1 text-ink">
              {order.address.house}, {order.address.street}, {order.address.city}, {order.address.state}{" "}
              {order.address.zip}
            </p>
          </div>
        </div>
      )}

      {asking && (
        <form onSubmit={sendRequest} className="mt-5 bg-paper p-4">
          <label className="block">
            <span className="text-sm font-medium text-ink">Why do you want to cancel?</span>
            <span className="mt-0.5 block text-xs text-stone">
              This parcel has already shipped, so the seller decides. If they approve, you're refunded in full.
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
              maxLength={300}
              rows={3}
              placeholder="e.g. Ordered the wrong size"
              className="field mt-3 resize-y"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" disabled={sending || reason.trim().length < 3} className="btn btn-primary px-4! py-2!">
              {sending ? "Sending…" : "Send request to seller"}
            </button>
            <button type="button" onClick={() => setAsking(false)} className="btn btn-outline px-4! py-2!">
              Never mind
            </button>
          </div>
        </form>
      )}

      {request?.status && <CancellationStatus request={request} />}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
        <span className="text-stone">
          {itemCount} {itemCount === 1 ? "item" : "items"} ·{" "}
          <span className="tabular font-semibold text-ink">{formatPrice(order.totalPrice)}</span>
          {PAYMENT_LABELS[order.payment?.status] && (
            <span
              className={`ml-2 text-xs font-medium ${
                order.payment.status === "PAID" ? "text-emerald-800" : "text-clay"
              }`}
            >
              · {PAYMENT_LABELS[order.payment.status]}
              {order.payment.status === "PAID" && order.payment.method && ` via ${order.payment.method.toUpperCase()}`}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-700">{error}</span>}
          {canRequest && !asking && (
            <button
              type="button"
              onClick={() => setAsking(true)}
              className="border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-ink"
            >
              Request cancellation
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={cancel}
              disabled={cancelling}
              className="border border-line px-3 py-1.5 text-xs font-medium text-red-800 hover:border-red-800 disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Cancel order"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-ink"
          >
            {open ? "Hide details" : "View details"}
          </button>
        </div>
      </div>
    </li>
  );
}

function WishlistPanel() {
  const { ids } = useWishlist();
  const { getById } = useProducts();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all(ids.map((id) => getById(id))).then((list) => {
      // pieces that were unpublished since they were saved are skipped
      if (active) setProducts(list.filter(Boolean));
    });
    return () => {
      active = false;
    };
  }, [ids, getById]);

  if (products === null) {
    return <p className="text-sm text-stone">Loading your wishlist…</p>;
  }

  if (products.length === 0) {
    return (
      <div className="border border-line bg-cream-dark p-8 text-center text-sm text-stone">
        Tap the heart on any piece to save it here for later.
        <Link to="/shop" className="mt-4 block font-medium text-ink underline">
          Browse the collection
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3">
      {products.map((p, i) => (
        <ProductCard key={p._id} product={p} index={i} />
      ))}
    </div>
  );
}

function SettingsPanel() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setDone("");
    if (form.next !== form.confirm) {
      setError("The new passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.changePassword(form.current, form.next);
      setDone(res.message);
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-md border border-line p-6">
      <h2 className="text-sm font-semibold text-ink">Change password</h2>
      <div className="mt-5 space-y-4">
        {[
          ["current", "Current password", "current-password"],
          ["next", "New password", "new-password"],
          ["confirm", "Confirm new password", "new-password"],
        ].map(([key, label, autoComplete]) => (
          <label key={key} className="block text-sm">
            <span className="mb-2 block text-xs font-medium text-ink">{label}</span>
            <input
              type="password"
              required
              minLength={key === "current" ? undefined : 6}
              maxLength={72}
              autoComplete={autoComplete}
              value={form[key]}
              onChange={set(key)}
              className="field"
            />
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-4 border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="mt-4 border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          {done}
        </p>
      )}
      <button type="submit" disabled={saving} className="btn btn-primary mt-6">
        {saving ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
