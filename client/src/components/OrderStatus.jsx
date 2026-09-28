const STATUS_STYLES = {
  DELIVERED: "bg-emerald-100 text-emerald-800",
  SHIPPED: "bg-sky-100 text-sky-800",
  PLACED: "bg-amber-100 text-amber-800",
  PENDING: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const STATUS_LABELS = {
  PLACED: "Placed",
  PENDING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

// PENDING sits between PLACED and SHIPPED ("being packed").
const STEPS = ["PLACED", "PENDING", "SHIPPED", "DELIVERED"];

export function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        STATUS_STYLES[status] || "bg-cream-dark text-ink"
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function StatusTracker({ status }) {
  if (status === "CANCELLED") {
    return (
      <p className="border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
        This order was cancelled.
      </p>
    );
  }
  const current = STEPS.indexOf(status);
  return (
    <ol className="grid grid-cols-4">
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step} className="relative flex flex-col items-center text-center">
            {i > 0 && (
              <span
                className={`absolute right-1/2 top-2.5 h-0.5 w-full ${
                  i <= current ? "bg-ink" : "bg-line"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                done ? "bg-ink text-cream" : "border border-line bg-cream text-stone"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={`mt-1.5 text-[11px] ${done ? "font-semibold text-ink" : "text-stone"}`}>
              {STATUS_LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export const ORDER_STATUSES = ["PLACED", "PENDING", "SHIPPED", "DELIVERED", "CANCELLED"];
export { STATUS_LABELS };
