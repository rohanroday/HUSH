import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../components/ProductCard";

const SHIPPING = 99;

export default function Cart() {
  const { user } = useAuth();
  const { items, totalPrice, loading, error, addItem, removeItem } = useCart();
  const navigate = useNavigate();
  const [busyKey, setBusyKey] = useState(null);
  const [actionError, setActionError] = useState("");

  if (!user) {
    return (
      <EmptyState
        title="Your bag"
        body="Your bag is saved to your HUSH account, so it follows you across devices."
        action={
          <Link to="/login" state={{ from: "/cart" }} className="btn btn-primary">
            Sign in to see it
          </Link>
        }
      />
    );
  }

  const keyFor = (item) => `${item.productId?._id}-${item.size}`;
  const count = items.reduce((n, i) => n + i.quantity, 0);

  const changeQty = async (item, delta) => {
    const key = keyFor(item);
    setBusyKey(key);
    setActionError("");
    try {
      if (delta > 0) {
        await addItem(item.productId._id, item.size, 1);
      } else {
        await removeItem(item.productId._id, item.size, 1);
      }
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyKey(null);
    }
  };

  const removeLine = async (item) => {
    const key = keyFor(item);
    setBusyKey(key);
    setActionError("");
    try {
      await removeItem(item.productId._id, item.size, item.quantity);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyKey(null);
    }
  };

  const subtotal = totalPrice;
  const total = subtotal + (items.length ? SHIPPING : 0);

  if (!loading && !error && items.length === 0) {
    return (
      <EmptyState
        title="Your bag is empty"
        body="Nothing in here yet. A heavyweight tee is a good place to start."
        action={
          <Link to="/shop" className="btn btn-primary">
            Browse the collection
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-360 px-4 pb-8 pt-10 sm:px-6 lg:px-10 lg:pt-14">
      <header className="mb-10 flex items-end justify-between gap-4 border-b border-ink pb-6">
        <h1 className="font-display text-6xl font-black uppercase leading-[0.85] text-ink sm:text-7xl">Your bag</h1>
        {count > 0 && <p className="tabular text-sm text-stone">{count} {count === 1 ? "item" : "items"}</p>}
      </header>

      {loading && items.length === 0 && <p className="text-sm text-stone">Loading your bag…</p>}
      {(error || actionError) && (
        <p role="alert" className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error ? `We couldn't load your bag: ${error}` : actionError}
        </p>
      )}

      {items.length > 0 && (
        <div className="grid gap-12 lg:grid-cols-12">
          <ul className="divide-y divide-line lg:col-span-8">
            {items.map((item) => {
              const key = keyFor(item);
              const busy = busyKey === key;
              const product = item.productId;
              const maxStock = product?.sizes?.find((s) => s.size === item.size)?.stock ?? 99;
              return (
                <li key={key} className={`flex gap-5 py-6 transition-opacity first:pt-0 ${busy ? "opacity-60" : ""}`}>
                  <Link to={`/product/${product?._id}`} className="h-36 w-28 shrink-0 overflow-hidden bg-cream-dark sm:h-44 sm:w-36">
                    {product?.images?.[0]?.url && (
                      <img src={product.images[0].url} alt={product.title} className="h-full w-full object-cover" />
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link to={`/product/${product?._id}`} className="text-base font-medium text-ink hover:underline">
                          {(product?.title ?? "Product").replace(/^Men /, "")}
                        </Link>
                        <p className="mt-1 text-sm text-stone">Size {item.size}</p>
                      </div>
                      <p className="tabular shrink-0 text-base font-medium text-ink">
                        {formatPrice(product && { ...product.price, amount: product.price.amount * item.quantity })}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex h-10 items-center border border-line bg-paper">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => changeQty(item, -1)}
                          className="flex h-full w-10 items-center justify-center text-ink disabled:opacity-30"
                          aria-label={`Decrease quantity of ${product?.title}`}
                        >
                          −
                        </button>
                        <span className="tabular w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={busy || item.quantity >= maxStock}
                          onClick={() => changeQty(item, 1)}
                          className="flex h-full w-10 items-center justify-center text-ink disabled:opacity-30"
                          aria-label={`Increase quantity of ${product?.title}`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeLine(item)}
                        className="link-draw text-xs font-medium text-stone hover:text-ink disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="lg:col-span-4">
            <div className="bg-paper p-6 lg:sticky lg:top-24 lg:p-8">
              <h2 className="text-sm font-semibold text-ink">Order summary</h2>
              <dl className="tabular mt-6 space-y-3 text-sm">
                <Row label="Subtotal" value={`₹${subtotal.toLocaleString("en-IN")}`} />
                <Row label="Standard shipping" value={`₹${SHIPPING}`} />
                <div className="border-t border-line pt-4">
                  <Row label="Total" value={`₹${total.toLocaleString("en-IN")}`} bold />
                </div>
              </dl>
              <button type="button" onClick={() => navigate("/checkout")} className="btn btn-primary mt-8 w-full py-4!">
                Continue to checkout
              </button>
              <Link to="/shop" className="link-draw mx-auto mt-4 block w-fit text-xs text-stone hover:text-ink">
                Keep shopping
              </Link>
              <p className="mt-8 border-t border-line pt-5 text-xs leading-relaxed text-stone">
                Unworn pieces can be returned within 7 days of delivery.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body, action }) {
  return (
    <div className="mx-auto max-w-360 px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
      <h1 className="font-display text-6xl font-black uppercase leading-[0.85] text-ink sm:text-7xl">{title}</h1>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-stone">{body}</p>
      <div className="mt-8">{action}</div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={bold ? "font-semibold text-ink" : "text-stone"}>{label}</dt>
      <dd className={bold ? "text-lg font-semibold text-ink" : "text-ink"}>{value}</dd>
    </div>
  );
}
