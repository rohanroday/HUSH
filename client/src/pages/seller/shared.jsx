export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
export const LOW_STOCK = 3;

export function money(amount, currency = "INR") {
  const symbol = currency === "USD" ? "$" : "₹";
  return `${symbol}${Math.round(amount).toLocaleString("en-IN")}`;
}

export function shortId(id) {
  return id.slice(-6).toUpperCase();
}

export function formatDate(value, withTime = false) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function timeAgo(value) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(value);
}

export function cleanTitle(title) {
  return title.replace(/^Men /, "");
}

// Revenue only counts orders that were actually paid online and not cancelled
// (orders from before payments existed were never charged).
export function earns(order) {
  return order.status !== "CANCELLED" && order.payment?.status === "PAID";
}

export const STATUS_META = {
  PLACED: { label: "New", tone: "bg-clay text-paper" },
  PENDING: { label: "Packing", tone: "bg-amber-100 text-amber-900" },
  SHIPPED: { label: "Shipped", tone: "bg-sky-100 text-sky-900" },
  DELIVERED: { label: "Delivered", tone: "bg-emerald-100 text-emerald-900" },
  CANCELLED: { label: "Cancelled", tone: "bg-cream-dark text-stone" },
};

export function StatusPill({ status }) {
  const meta = STATUS_META[status] ?? { label: status, tone: "bg-cream-dark text-ink" };
  return (
    <span className={`inline-flex items-center px-2 py-1 text-[11px] font-semibold tracking-wide ${meta.tone}`}>
      {meta.label}
    </span>
  );
}

export function PaymentNote({ payment }) {
  if (!payment) return <span className="text-xs text-stone">No online payment</span>;
  const map = {
    PAID: ["Paid", "text-emerald-800"],
    REFUND_PENDING: ["Refund processing", "text-clay"],
    REFUNDED: ["Refunded", "text-stone"],
  };
  const [label, tone] = map[payment.status] ?? [payment.status, "text-stone"];
  return (
    <span className={`text-xs font-medium ${tone}`}>
      {label}
      {payment.status === "PAID" && payment.method && ` · ${payment.method.toUpperCase()}`}
    </span>
  );
}

export function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`bg-paper ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Icon({ name, size = 18 }) {
  const paths = {
    overview: <path d="M4 13h6V4H4zm10 7h6v-9h-6zM4 20h6v-4H4zm10-11h6V4h-6z" />,
    orders: (
      <>
        <path d="M5.5 8.5h13l-1 12h-11l-1-12Z" />
        <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
      </>
    ),
    products: (
      <>
        <path d="M8 4 4 7l2 4 2-1v10h8V10l2 1 2-4-4-3-2 1.5a2.5 2.5 0 0 1-4 0Z" />
      </>
    ),
    add: <path d="M12 5v14M5 12h14" />,
    alerts: (
      <>
        <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z" />
        <path d="M10 20.5a2 2 0 0 0 4 0" />
      </>
    ),
    arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-4.2-4.2" />
      </>
    ),
    image: (
      <>
        <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
        <circle cx="9" cy="10" r="1.8" />
        <path d="m20.5 16-5-5-8.5 8.5" />
      </>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
