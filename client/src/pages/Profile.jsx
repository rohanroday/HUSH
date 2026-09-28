import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { formatPrice } from "../components/ProductCard";
import { StatusBadge, StatusTracker } from "../components/OrderStatus";

const SIDEBAR = [
  { key: "orders", label: "My Orders" },
  { key: "profile", label: "My Profile" },
  { key: "wishlist", label: "Wishlist" },
  { key: "addresses", label: "Addresses" },
  { key: "settings", label: "Settings" },
];

const ORDER_TABS = ["All", "PLACED", "SHIPPED", "DELIVERED", "CANCELLED"];

export default function Profile() {
  const { user, loading, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "orders";

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
          {tab === "addresses" && <AddressesPanel />}
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
          <OrderCard key={order._id} order={order} onChanged={load} />
        ))}
      </ul>
    </div>
  );
}

function OrderCard({ order, onChanged }) {
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const canCancel = ["PLACED", "PENDING"].includes(order.status);
  const itemCount = order.products.reduce((n, p) => n + p.quantity, 0);

  const cancel = async () => {
    if (!window.confirm("Cancel this order?")) return;
    setCancelling(true);
    setError("");
    try {
      await api.cancelOrder(order._id);
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
        <span className="text-stone">
          {itemCount} {itemCount === 1 ? "item" : "items"} ·{" "}
          <span className="font-semibold text-ink">{formatPrice(order.totalPrice)}</span>
        </span>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-700">{error}</span>}
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
  return (
    <div className="border border-line bg-cream-dark p-8 text-center text-sm text-stone">
      Wishlist items you save while browsing will show up here. The current backend
      doesn't persist a wishlist yet — this is a UI placeholder for that feature.
    </div>
  );
}

function AddressesPanel() {
  return (
    <div className="border border-line bg-cream-dark p-8 text-center text-sm text-stone">
      Saved addresses aren't stored by the backend yet — for now, enter your address
      each time you check out.
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="border border-line p-6 text-sm text-stone">
      Account settings (password reset, notification preferences) aren't exposed by
      the backend API yet.
    </div>
  );
}
