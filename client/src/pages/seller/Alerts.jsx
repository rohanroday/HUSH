import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationsContext";
import { timeAgo } from "./shared";

const TYPE_META = {
  NEW_ORDER: { label: "Order", dot: "bg-clay", tab: "orders" },
  ORDER_CANCELLED: { label: "Cancelled", dot: "bg-stone", tab: "orders" },
  LOW_STOCK: { label: "Stock", dot: "bg-amber-500", tab: "products" },
  CANCEL_REQUEST: { label: "Request", dot: "bg-red-700", tab: "orders" },
  CONTACT_MESSAGE: { label: "Message", dot: "bg-sky-700", tab: "alerts" },
};

export function NotificationItem({ notification, compact = false }) {
  const { markRead } = useNotifications();
  const navigate = useNavigate();
  const meta = TYPE_META[notification.type] ?? TYPE_META.NEW_ORDER;
  const isMessage = notification.type === "CONTACT_MESSAGE";

  const open = () => {
    if (!notification.read) markRead(notification._id);
    navigate(`/seller?tab=${meta.tab}`);
  };

  return (
    <li>
      <button
        type="button"
        onClick={open}
        className={`flex w-full items-start gap-3 px-5 text-left transition-colors hover:bg-cream/60 ${compact ? "py-3" : "py-4"}`}
      >
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? "bg-line" : meta.dot}`}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className={`truncate text-sm ${notification.read ? "text-ink-soft" : "font-semibold text-ink"}`}>
              {notification.title}
            </span>
            <span className="shrink-0 text-[11px] text-stone">{timeAgo(notification.createdAt)}</span>
          </span>
          {notification.body && (
            <span
              className={`mt-0.5 block text-xs leading-relaxed text-stone ${
                compact ? "truncate" : isMessage ? "whitespace-pre-line break-words" : ""
              }`}
            >
              {notification.body}
            </span>
          )}
        </span>
        {!notification.read && <span className="sr-only">(unread)</span>}
      </button>
      {isMessage && notification.replyTo && !compact && (
        <a
          href={`mailto:${notification.replyTo}?subject=${encodeURIComponent(`Re: ${notification.title}`)}`}
          onClick={() => !notification.read && markRead(notification._id)}
          className="mb-4 ml-10 inline-block text-xs font-medium text-ink underline underline-offset-4"
        >
          Reply to {notification.replyTo}
        </a>
      )}
    </li>
  );
}

export default function Alerts() {
  const { notifications, unread, markAllRead } = useNotifications();

  return (
    <section className="bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <p className="text-sm text-ink">
          <span className="tabular font-semibold">{unread}</span> unread
          <span className="ml-2 text-xs text-stone">Checked every 30 seconds</span>
        </p>
        {unread > 0 && (
          <button type="button" onClick={markAllRead} className="text-xs font-medium text-ink underline-offset-4 hover:underline">
            Mark all as read
          </button>
        )}
      </header>
      {notifications.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <p className="font-display text-4xl font-black uppercase text-ink">All quiet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-stone">
            You'll be notified here when a customer pays for your pieces, cancels an order, sends you a message, or a size runs low.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {notifications.map((n) => (
            <NotificationItem key={n._id} notification={n} />
          ))}
        </ul>
      )}
    </section>
  );
}
