import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { formatPrice } from "../components/ProductCard";
import { openCheckout } from "../lib/razorpay";

const SHIPPING = 99;

export default function Checkout() {
  const { user } = useAuth();
  const { items, totalPrice, refresh } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState({ house: "", street: "", city: "", state: "", zip: "" });
  // idle → starting (holding stock) → paying (Razorpay modal) → confirming → done
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [placed, setPlaced] = useState(null);

  const update = (field) => (e) => setAddress((a) => ({ ...a, [field]: e.target.value }));
  const busy = phase !== "idle";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setPhase("starting");

    let checkout;
    try {
      checkout = (await api.startCheckout(address)).data;
    } catch (err) {
      setError(err.message);
      setPhase("idle");
      return;
    }

    try {
      setPhase("paying");
      const count = items.reduce((n, i) => n + i.quantity, 0);
      const result = await openCheckout({
        ...checkout,
        description: `${count} ${count === 1 ? "item" : "items"} from HUSH`,
      });

      if (result.status === "paid") {
        setPhase("confirming");
        const res = await api.verifyPayment({ orderId: checkout.orderId, ...result.response });
        setPlaced(res.data.order);
        setPhase("done");
        refresh();
        return;
      }

      // Modal closed: let the server double-check with Razorpay, then release the hold.
      setPhase("confirming");
      const res = await api.abandonCheckout(checkout.orderId);
      if (res.data.outcome === "paid") {
        setPlaced(res.data.order);
        setPhase("done");
        refresh();
        return;
      }
      setNotice(
        result.lastError
          ? `Payment didn't go through: ${result.lastError} Your bag is saved, so you can try again.`
          : "Payment cancelled. Nothing was charged and your bag is saved."
      );
    } catch (err) {
      setError(err.message);
    }
    setPhase("idle");
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
        title="Paid. Thank you."
        body={`Order #${placed._id?.slice(-6).toUpperCase()} is confirmed and the studio has been notified. You can follow it from your account as it's packed and shipped.`}
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
          Paid <span className="font-semibold">{formatPrice(placed.totalPrice)}</span>
          {placed.payment?.method && <> by {placed.payment.method.toUpperCase()}</>}
          {placed.payment?.razorpayPaymentId && (
            <span className="mt-1 block text-xs text-stone">Payment ID {placed.payment.razorpayPaymentId}</span>
          )}
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
          <fieldset disabled={busy} className="mt-6 grid gap-5 disabled:opacity-60 sm:grid-cols-2">
            <Field label="House / flat no." autoComplete="address-line1" value={address.house} onChange={update("house")} required />
            <Field label="Street" autoComplete="address-line2" value={address.street} onChange={update("street")} required />
            <Field label="City" autoComplete="address-level2" value={address.city} onChange={update("city")} required />
            <Field label="State" autoComplete="address-level1" value={address.state} onChange={update("state")} required />
            <Field label="PIN code" autoComplete="postal-code" inputMode="numeric" value={address.zip} onChange={update("zip")} required />
          </fieldset>

          {error && (
            <p role="alert" className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-6 border border-line bg-paper p-4 text-sm text-ink">
              {notice}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn btn-primary mt-8 w-full py-4! sm:w-auto sm:px-10!">
            {phase === "starting"
              ? "Reserving your pieces…"
              : phase === "paying"
                ? "Complete payment in the Razorpay window"
                : phase === "confirming"
                  ? "Confirming your payment…"
                  : `Pay ₹${total.toLocaleString("en-IN")} securely`}
          </button>

          <div className="mt-6 flex items-start gap-3 text-xs leading-relaxed text-stone">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mt-0.5 shrink-0" aria-hidden="true">
              <rect x="4.5" y="10.5" width="15" height="10" rx="1.5" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
            </svg>
            <p>
              Payments are processed securely by Razorpay. Your pieces are held for{" "}
              20 minutes while you pay, and your card details never touch our servers.
            </p>
          </div>
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
