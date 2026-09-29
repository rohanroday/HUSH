import { useMemo, useState } from "react";
import { api } from "../../api/client";
import { cleanTitle, formatDate, Icon, money, PaymentNote, shortId, STATUS_META, StatusPill } from "./shared";

const TABS = [
  ["REQUESTS", "Cancel requests"],
  ["TODO", "To ship"],
  ["SHIPPED", "Shipped"],
  ["DELIVERED", "Delivered"],
  ["CANCELLED", "Cancelled"],
  ["ALL", "All"],
];

// The one-click next step for each status, in the order a seller works.
const ACTIONS = {
  PENDING: { label: "Start packing", primary: false },
  SHIPPED: { label: "Mark as shipped", primary: true },
  DELIVERED: { label: "Mark as delivered", primary: true },
};

const isRequested = (order) => order.cancellationRequest?.status === "REQUESTED";

function inTab(order, tab) {
  if (tab === "ALL") return true;
  if (tab === "REQUESTS") return isRequested(order);
  if (tab === "TODO") return order.status === "PLACED" || order.status === "PENDING";
  return order.status === tab;
}

export default function Orders({ orders, onChanged }) {
  const [tab, setTab] = useState(() => (orders.some(isRequested) ? "REQUESTS" : "TODO"));
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter(
      (o) =>
        inTab(o, tab) &&
        (!q ||
          shortId(o._id).toLowerCase().includes(q) ||
          o.customer?.name.toLowerCase().includes(q) ||
          o.customer?.email.toLowerCase().includes(q) ||
          o.address?.city.toLowerCase().includes(q))
    );
  }, [orders, tab, query]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map(([key, label]) => {
            const count = orders.filter((o) => inTab(o, key)).length;
            if (key === "REQUESTS" && count === 0 && tab !== key) return null;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={tab === key}
                onClick={() => setTab(key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  tab === key ? "bg-ink text-cream" : "bg-paper text-ink hover:bg-cream-dark"
                }`}
              >
                {label} <span className="tabular opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search orders</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone">
            <Icon name="search" size={15} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order #, customer or city"
            className="field py-2! pl-9!"
          />
        </label>
      </div>

      {orders.length === 0 ? (
        <div className="bg-paper px-6 py-20 text-center">
          <p className="font-display text-4xl font-black uppercase text-ink">No orders yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-stone">
            When a customer pays for one of your pieces it lands here, and you'll get a notification.
          </p>
        </div>
      ) : shown.length === 0 ? (
        <p className="bg-paper px-6 py-12 text-center text-sm text-stone">
          {tab === "TODO" && !query ? "All caught up. Nothing waiting to ship." : "No orders match."}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((order) => (
            <OrderRow
              key={order._id}
              order={order}
              open={openId === order._id}
              onToggle={() => setOpenId((id) => (id === order._id ? null : order._id))}
              onChanged={onChanged}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderRow({ order, open, onToggle, onChanged }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const units = order.products.reduce((n, p) => n + p.quantity, 0);
  const next = (order.nextStatuses || []).filter((s) => s !== "CANCELLED");
  const canCancel = (order.nextStatuses || []).includes("CANCELLED");
  const paid = order.payment?.status === "PAID";
  const request = order.cancellationRequest;
  const requested = request?.status === "REQUESTED";

  const move = async (status) => {
    setBusy(status);
    setError("");
    try {
      await api.updateOrderStatus(order._id, status);
      setConfirming(false);
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className={`bg-paper transition-shadow ${open ? "shadow-[0_12px_32px_-20px_rgba(21,20,17,0.4)]" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 text-left transition-colors hover:bg-cream/50 md:grid-cols-[120px_minmax(0,1.6fr)_minmax(0,1fr)_110px_100px_20px]"
      >
        <div>
          <p className="tabular text-sm font-semibold text-ink">#{shortId(order._id)}</p>
          <p className="text-xs text-stone">{formatDate(order.payment?.paidAt || order.createdAt, true)}</p>
        </div>
        <div className="hidden min-w-0 items-center gap-2 md:flex">
          <div className="flex -space-x-3">
            {order.products.slice(0, 3).map((p, i) => (
              <div key={i} className="h-11 w-9 overflow-hidden bg-cream-dark ring-2 ring-paper">
                {p.product.image && <img src={p.product.image} alt="" className="h-full w-full object-cover" />}
              </div>
            ))}
          </div>
          <p className="truncate text-sm text-ink">
            {cleanTitle(order.products[0]?.product.title ?? "")}
            {order.products.length > 1 && <span className="text-stone"> +{order.products.length - 1} more</span>}
          </p>
        </div>
        <div className="hidden min-w-0 md:block">
          <p className="truncate text-sm text-ink">{order.customer?.name ?? "Customer"}</p>
          <p className="truncate text-xs text-stone">{order.address?.city}</p>
        </div>
        <div className="md:text-right">
          <p className="tabular text-sm font-semibold text-ink">{money(order.sellerTotal, order.totalPrice.currency)}</p>
          <p className="text-xs text-stone">
            {units} {units === 1 ? "unit" : "units"}
          </p>
        </div>
        <div className="col-start-2 row-start-1 flex flex-col items-end gap-1 md:col-start-auto md:row-start-auto md:items-start">
          <StatusPill status={order.status} />
          {requested && (
            <span className="bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-900">
              Cancel requested
            </span>
          )}
        </div>
        <span className={`hidden text-stone transition-transform duration-300 md:block ${open ? "rotate-90" : ""}`}>
          <Icon name="arrow" size={16} />
        </span>
      </button>

      {open && (
        <div className="grid gap-8 border-t border-line px-5 py-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-stone">Your items in this order</p>
            <ul className="mt-3 divide-y divide-line">
              {order.products.map((p, i) => (
                <li key={i} className="flex items-center gap-4 py-3">
                  <div className="h-16 w-13 shrink-0 overflow-hidden bg-cream-dark">
                    {p.product.image && <img src={p.product.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{cleanTitle(p.product.title)}</p>
                    <p className="text-xs text-stone">
                      Size <span className="font-semibold text-ink">{p.size}</span> · Qty{" "}
                      <span className="font-semibold text-ink">{p.quantity}</span>
                    </p>
                  </div>
                  <p className="tabular text-sm text-ink">
                    {money(p.product.price.amount * p.quantity, p.product.price.currency)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            <dl className="grid grid-cols-[88px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-stone">Customer</dt>
              <dd className="text-ink">
                {order.customer?.name}
                <span className="block text-xs text-stone">{order.customer?.email}</span>
              </dd>
              <dt className="text-stone">Ship to</dt>
              <dd className="text-ink">
                {order.address.house}, {order.address.street}
                <span className="block">
                  {order.address.city}, {order.address.state} {order.address.zip}
                </span>
              </dd>
              <dt className="text-stone">Payment</dt>
              <dd>
                <PaymentNote payment={order.payment} />
                {order.payment?.razorpayPaymentId && (
                  <span className="tabular block text-xs text-stone">{order.payment.razorpayPaymentId}</span>
                )}
              </dd>
            </dl>

            {requested && <RequestPanel order={order} paid={paid} onChanged={onChanged} />}

            {request?.status && request.status !== "REQUESTED" && (
              <p className="border-t border-line pt-4 text-xs text-stone">
                Customer asked to cancel{request.reason ? `: “${request.reason}”` : ""}.{" "}
                <span className="font-medium text-ink">{request.status === "APPROVED" ? "You approved it." : "You declined it."}</span>
                {request.sellerNote && <> Your note: “{request.sellerNote}”</>}
              </p>
            )}

            {!requested && (next.length > 0 || canCancel) && (
              <div className="border-t border-line pt-5">
                {!confirming ? (
                  <div className="flex flex-wrap gap-2">
                    {next.map((status) => {
                      const action = ACTIONS[status] ?? { label: `Mark ${STATUS_META[status]?.label}` };
                      return (
                        <button
                          key={status}
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => move(status)}
                          className={`btn px-4! py-2.5! ${action.primary ? "btn-primary" : "btn-outline"}`}
                        >
                          {busy === status ? "Saving…" : action.label}
                        </button>
                      );
                    })}
                    {canCancel && (
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => setConfirming(true)}
                        className="btn px-4! py-2.5! text-red-800 hover:bg-red-50"
                      >
                        {paid ? "Cancel & refund" : "Cancel order"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-900">
                      {order.status === "SHIPPED" && "This parcel has already shipped. "}
                      {paid
                        ? `Cancel order #${shortId(order._id)} and refund ${money(order.totalPrice.amount, order.totalPrice.currency)} to the customer? Stock goes back on sale.`
                        : `Cancel order #${shortId(order._id)}? Stock goes back on sale.`}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => move("CANCELLED")}
                        className="btn bg-red-800 px-4! py-2! text-paper hover:bg-red-900"
                      >
                        {busy === "CANCELLED" ? "Cancelling…" : paid ? "Yes, cancel and refund" : "Yes, cancel"}
                      </button>
                      <button type="button" onClick={() => setConfirming(false)} className="btn btn-outline px-4! py-2!">
                        Keep order
                      </button>
                    </div>
                  </div>
                )}
                {error && <p className="mt-3 text-sm text-red-800">{error}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function RequestPanel({ order, paid, onChanged }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [declining, setDeclining] = useState(false);
  const { reason, requestedAt } = order.cancellationRequest;

  const respond = async (decision) => {
    setBusy(decision);
    setError("");
    try {
      await api.respondToCancellation(order._id, decision, note.trim() || undefined);
      await onChanged();
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  };

  return (
    <div className="border border-red-200 bg-red-50/60 p-4">
      <p className="text-sm font-semibold text-red-950">The customer wants to cancel this shipped order</p>
      <p className="mt-0.5 text-xs text-red-900/80">Asked {formatDate(requestedAt, true)}</p>
      {reason && <p className="mt-3 bg-paper px-3 py-2 text-sm text-ink">“{reason}”</p>}

      {declining ? (
        <div className="mt-3">
          <label className="block">
            <span className="text-xs font-medium text-ink">Note to the customer (optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="e.g. It's out for delivery today. You can return it unworn within 7 days."
              className="field mt-1.5 resize-y"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={Boolean(busy)} onClick={() => respond("DECLINE")} className="btn btn-primary px-4! py-2!">
              {busy === "DECLINE" ? "Sending…" : "Decline request"}
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={() => setDeclining(false)} className="btn btn-outline px-4! py-2!">
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => respond("APPROVE")}
            className="btn bg-red-800 px-4! py-2! text-paper hover:bg-red-900"
          >
            {busy === "APPROVE"
              ? "Cancelling…"
              : paid
                ? `Approve & refund ${money(order.totalPrice.amount, order.totalPrice.currency)}`
                : "Approve cancellation"}
          </button>
          <button type="button" disabled={Boolean(busy)} onClick={() => setDeclining(true)} className="btn btn-outline px-4! py-2!">
            Decline
          </button>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-800">{error}</p>}
    </div>
  );
}
