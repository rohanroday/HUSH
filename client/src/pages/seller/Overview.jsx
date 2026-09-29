import RevenueChart from "./RevenueChart";
import { cleanTitle, earns, LOW_STOCK, money, Panel, shortId, StatusPill, timeAgo } from "./shared";
import { NotificationItem } from "./Alerts";

export default function Overview({ orders, products, notifications, onOpen }) {
  const paidOrders = orders.filter(earns);
  const revenue = paidOrders.reduce((n, o) => n + o.sellerTotal, 0);
  const toShip = orders
    .filter((o) => o.status === "PLACED" || o.status === "PENDING")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const unitsSold = paidOrders.reduce((n, o) => n + o.products.reduce((m, p) => m + p.quantity, 0), 0);
  const lowStock = products
    .flatMap((p) => p.sizes.filter((s) => s.stock <= LOW_STOCK).map((s) => ({ product: p, ...s })))
    .sort((a, b) => a.stock - b.stock);
  const live = products.filter((p) => p.isPublished).length;

  const requests = orders.filter((o) => o.cancellationRequest?.status === "REQUESTED");

  return (
    <div className="space-y-4">
      {requests.length > 0 && (
        <button
          type="button"
          onClick={() => onOpen("orders")}
          className="flex w-full items-center justify-between gap-4 border border-red-200 bg-red-50 px-5 py-4 text-left transition-colors hover:bg-red-100/70"
        >
          <span>
            <span className="block text-sm font-semibold text-red-950">
              {requests.length} {requests.length === 1 ? "customer wants" : "customers want"} to cancel a shipped order
            </span>
            <span className="mt-0.5 block text-xs text-red-900/80">
              {requests.map((o) => `#${shortId(o._id)}`).join(", ")}: approve to refund, or decline with a note.
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-red-950 underline underline-offset-4">Review</span>
        </button>
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel className="flex flex-col">
          <div className="px-5 pt-5">
            <p className="text-xs text-stone">Paid revenue, all time</p>
            <p className="tabular font-display mt-1 text-6xl font-black leading-none text-ink">{money(revenue)}</p>
            <p className="tabular mt-2 text-xs text-stone">
              {paidOrders.length} paid {paidOrders.length === 1 ? "order" : "orders"} · {unitsSold} {unitsSold === 1 ? "unit" : "units"} sold
            </p>
          </div>
          <RevenueChart orders={orders} />
        </Panel>

        <div className="grid grid-cols-2 gap-4">
          <Stat label="Waiting to ship" value={toShip.length} tone={toShip.length ? "text-clay" : "text-ink"} onClick={() => onOpen("orders")} />
          <Stat label="Live products" value={`${live}/${products.length}`} onClick={() => onOpen("products")} />
          <Stat label="Sizes low or sold out" value={lowStock.length} tone={lowStock.length ? "text-clay" : "text-ink"} onClick={() => onOpen("products")} />
          <Stat
            label="Unread alerts"
            value={notifications.filter((n) => !n.read).length}
            onClick={() => onOpen("alerts")}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Ship these next"
          className="lg:col-span-2"
          action={
            <button type="button" onClick={() => onOpen("orders")} className="text-xs font-medium text-ink underline-offset-4 hover:underline">
              All orders
            </button>
          }
        >
          {toShip.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-stone">Nothing waiting. Every paid order has shipped.</p>
          ) : (
            <ul className="divide-y divide-line">
              {toShip.slice(0, 5).map((order) => (
                <li key={order._id}>
                  <button
                    type="button"
                    onClick={() => onOpen("orders")}
                    className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-cream/60"
                  >
                    <div className="h-12 w-10 overflow-hidden bg-cream-dark">
                      {order.products[0]?.product.image && (
                        <img src={order.products[0].product.image} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">
                        <span className="tabular font-semibold">#{shortId(order._id)}</span> · {order.customer?.name}
                      </p>
                      <p className="truncate text-xs text-stone">
                        {order.products.map((p) => `${cleanTitle(p.product.title)} (${p.size})`).join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden text-xs text-stone sm:inline">{timeAgo(order.payment?.paidAt || order.createdAt)}</span>
                      <StatusPill status={order.status} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Running low"
          action={
            <button type="button" onClick={() => onOpen("products")} className="text-xs font-medium text-ink underline-offset-4 hover:underline">
              Restock
            </button>
          }
        >
          {lowStock.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-stone">Every size has more than {LOW_STOCK} in stock.</p>
          ) : (
            <ul className="divide-y divide-line">
              {lowStock.slice(0, 6).map((row) => (
                <li key={`${row.product._id}-${row.size}`} className="flex items-center justify-between gap-3 px-5 py-3">
                  <p className="min-w-0 truncate text-sm text-ink">
                    {cleanTitle(row.product.title)} <span className="text-stone">· {row.size}</span>
                  </p>
                  <span
                    className={`tabular shrink-0 px-2 py-0.5 text-xs font-semibold ${
                      row.stock === 0 ? "bg-red-50 text-red-900" : "bg-amber-50 text-amber-900"
                    }`}
                  >
                    {row.stock === 0 ? "Sold out" : `${row.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Latest alerts"
        action={
          <button type="button" onClick={() => onOpen("alerts")} className="text-xs font-medium text-ink underline-offset-4 hover:underline">
            See all
          </button>
        }
      >
        {notifications.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-stone">
            New paid orders, cancellations and low-stock warnings will show up here.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {notifications.slice(0, 3).map((n) => (
              <NotificationItem key={n._id} notification={n} compact />
            ))}
          </ul>
        )}
      </Panel>

    </div>
  );
}

function Stat({ label, value, tone = "text-ink", onClick }) {
  return (
    <button type="button" onClick={onClick} className="group flex flex-col justify-between bg-paper p-5 text-left transition-colors hover:bg-cream-dark/60">
      <span className="text-xs text-stone">{label}</span>
      <span className={`tabular font-display mt-6 text-5xl font-black leading-none ${tone}`}>{value}</span>
    </button>
  );
}
