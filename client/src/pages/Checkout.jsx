import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { formatPrice } from "../components/ProductCard";

const SHIPPING = 99;

export default function Checkout() {
  const { user } = useAuth();
  const { items, totalPrice, refresh } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState({ house: "", street: "", city: "", state: "", zip: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState(null);

  const update = (field) => (e) => setAddress((a) => ({ ...a, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await api.createOrder(address);
      setPlaced(res.data.order);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Message
        title="Checkout"
        body="Orders are tied to your HUSH account so you can track them afterwards."
        action={
          <Link to="/login" state={{ from: "/checkout" }} className="btn btn-primary">
            Sign in to continue
          </Link>
        }
      />
    );
  }

  if (placed) {
    return (
      <Message
        title="Order placed"
        body={`Order #${placed._id?.slice(-6).toUpperCase()} is in. We'll pack it next; you can follow its progress from your account.`}
        action={
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate("/profile?tab=orders")} className="btn btn-primary">
              Track this order
            </button>
            <Link to="/shop" className="btn btn-outline">
              Keep shopping
            </Link>
          </div>
        }
      >
        <p className="tabular mt-8 text-sm text-ink">
          Order total: <span className="font-semibold">{formatPrice(placed.totalPrice)}</span> + ₹{SHIPPING} shipping
        </p>
      </Message>
    );
  }

  if (items.length === 0) {
    return (
      <Message
        title="Nothing to check out"
        body="Your bag is empty. Add a piece or two first."
        action={
          <Link to="/shop" className="btn btn-primary">
            Browse the collection
          </Link>
        }
      />
    );
  }

  const total = totalPrice + SHIPPING;

  return (
    <div className="mx-auto max-w-360 px-4 pb-8 pt-10 sm:px-6 lg:px-10 lg:pt-14">
      <header className="mb-10 border-b border-ink pb-6">
        <h1 className="font-display text-6xl font-black uppercase leading-[0.85] text-ink sm:text-7xl">Checkout</h1>
      </header>

      <div className="grid gap-12 lg:grid-cols-12">
        <form onSubmit={submit} className="lg:col-span-7">
          <h2 className="text-sm font-semibold text-ink">Where should we send it?</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="House / flat no." autoComplete="address-line1" value={address.house} onChange={update("house")} required />
            <Field label="Street" autoComplete="address-line2" value={address.street} onChange={update("street")} required />
            <Field label="City" autoComplete="address-level2" value={address.city} onChange={update("city")} required />
            <Field label="State" autoComplete="address-level1" value={address.state} onChange={update("state")} required />
            <Field label="PIN code" autoComplete="postal-code" inputMode="numeric" value={address.zip} onChange={update("zip")} required />
          </div>

          {error && (
            <p role="alert" className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              We couldn't place the order: {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn btn-primary mt-8 w-full py-4! sm:w-auto sm:px-10!">
            {submitting ? "Placing your order…" : `Place order · ₹${total.toLocaleString("en-IN")}`}
          </button>
        </form>

        <aside className="lg:col-span-5">
          <div className="bg-paper p-6 lg:sticky lg:top-24 lg:p-8">
            <h2 className="text-sm font-semibold text-ink">In your bag</h2>
            <ul className="mt-5 space-y-4">
              {items.map((item) => {
                const p = item.productId;
                return (
                  <li key={`${p?._id}-${item.size}`} className="flex items-center gap-4">
                    <div className="h-20 w-16 shrink-0 overflow-hidden bg-cream-dark">
                      {p?.images?.[0]?.url && <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{p?.title.replace(/^Men /, "")}</p>
                      <p className="mt-0.5 text-xs text-stone">
                        Size {item.size} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="tabular text-sm text-ink">
                      {formatPrice(p && { ...p.price, amount: p.price.amount * item.quantity })}
                    </p>
                  </li>
                );
              })}
            </ul>
            <dl className="tabular mt-6 space-y-3 border-t border-line pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone">Subtotal</dt>
                <dd className="text-ink">₹{totalPrice.toLocaleString("en-IN")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone">Standard shipping</dt>
                <dd className="text-ink">₹{SHIPPING}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-4 text-base font-semibold text-ink">
                <dt>Total</dt>
                <dd>₹{total.toLocaleString("en-IN")}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Message({ title, body, action, children }) {
  return (
    <div className="mx-auto max-w-360 px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
      <h1 className="font-display text-6xl font-black uppercase leading-[0.85] text-ink sm:text-7xl">{title}</h1>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-stone">{body}</p>
      {children}
      <div className="mt-8">{action}</div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block text-xs font-medium text-ink">{label}</span>
      <input {...props} className="field" />
    </label>
  );
}
