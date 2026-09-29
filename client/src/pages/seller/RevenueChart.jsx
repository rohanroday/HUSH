import { useMemo, useState } from "react";
import { earns, money } from "./shared";

const DAYS = 14;
const BAR = "#9a4a22"; // brand rust, validated: L/chroma band + 3:1 vs the paper surface
const HEIGHT = 180;

function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function niceMax(value) {
  if (value <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value / 4) * magnitude;
  return Math.ceil(value / step) * step;
}

// Daily revenue for the last two weeks: one series, so no legend; every bar
// carries its own hover/focus tooltip and the same numbers live in a table.
export default function RevenueChart({ orders }) {
  const [active, setActive] = useState(null);

  const days = useMemo(() => {
    const totals = new Map();
    for (const order of orders) {
      if (!earns(order)) continue;
      const key = dayKey(order.payment?.paidAt || order.createdAt);
      totals.set(key, (totals.get(key) || 0) + order.sellerTotal);
    }
    return Array.from({ length: DAYS }, (_, i) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (DAYS - 1 - i));
      return { date, value: totals.get(dayKey(date)) || 0 };
    });
  }, [orders]);

  const total = days.reduce((n, d) => n + d.value, 0);
  const max = niceMax(Math.max(...days.map((d) => d.value)));
  const ticks = [0, max / 2, max];
  const label = (d) => d.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <figure className="px-5 pb-5 pt-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs text-stone">Paid revenue, last 14 days</span>
        <span className="tabular text-sm font-semibold text-ink">{money(total)}</span>
      </figcaption>

      {total === 0 ? (
        <div className="mt-4 flex h-[180px] items-center justify-center border border-dashed border-line text-center text-sm text-stone">
          No paid sales in the last two weeks yet.
          <br />
          New orders will chart here as they come in.
        </div>
      ) : (
        <div className="relative mt-4 flex gap-3">
          <div className="tabular flex h-[180px] flex-col-reverse justify-between text-right text-[11px] text-stone" aria-hidden="true">
            {ticks.map((t) => (
              <span key={t} className="-my-1.5 leading-3">
                {t >= 1000 ? `${t / 1000}k` : t}
              </span>
            ))}
          </div>
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[180px] flex-col justify-between" aria-hidden="true">
              {ticks.map((t) => (
                <span key={t} className={`h-px ${t === 0 ? "bg-stone/50" : "bg-line"}`} />
              ))}
            </div>
            <div className="relative grid h-[180px] gap-[2px]" style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}>
              {days.map((d, i) => {
                const h = d.value ? Math.max(3, (d.value / max) * HEIGHT) : 0;
                return (
                  <button
                    key={i}
                    type="button"
                    onPointerEnter={() => setActive(i)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    aria-label={`${label(d)}: ${money(d.value)}`}
                    className="group relative flex h-full items-end justify-center outline-offset-2"
                  >
                    <span
                      className="w-full max-w-6 rounded-t-[4px] transition-opacity duration-150"
                      style={{ height: h, background: BAR, opacity: active === null || active === i ? 1 : 0.45 }}
                    />
                  </button>
                );
              })}
            </div>
            {active !== null && (
              <div
                className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap bg-ink px-3 py-2 text-cream shadow-lg"
                style={{ left: `${((active + 0.5) / DAYS) * 100}%` }}
              >
                <p className="tabular text-sm font-semibold">{money(days[active].value)}</p>
                <p className="text-[11px] text-cream/70">{label(days[active])}</p>
              </div>
            )}
            <div className="mt-2 flex justify-between text-[11px] text-stone" aria-hidden="true">
              <span>{label(days[0])}</span>
              <span>{label(days[Math.floor(DAYS / 2)])}</span>
              <span>Today</span>
            </div>
          </div>
        </div>
      )}

      <table className="sr-only">
        <caption>Paid revenue per day, last 14 days</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d, i) => (
            <tr key={i}>
              <td>{label(d)}</td>
              <td>{money(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
