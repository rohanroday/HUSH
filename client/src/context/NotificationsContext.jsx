import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

const NotificationsContext = createContext(null);
const POLL_MS = 30000;

// Sellers get alerts for new paid orders, cancellations and low stock. This
// polls quietly in the background and pops a toast when something new lands.
export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const isSeller = user?.role === "seller";
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState(null);
  const seen = useRef(null);

  const refresh = useCallback(async () => {
    if (!isSeller) return;
    try {
      const { data } = await api.getNotifications();
      setNotifications(data.notifications);
      setUnread(data.unread);

      const ids = new Set(data.notifications.map((n) => n._id));
      if (seen.current) {
        const fresh = data.notifications.find((n) => !n.read && !seen.current.has(n._id));
        if (fresh) setToast(fresh);
      }
      seen.current = ids;
    } catch {
      // keep the last good list; the next poll will try again
    }
  }, [isSeller]);

  useEffect(() => {
    if (!isSeller) {
      setNotifications([]);
      setUnread(0);
      seen.current = null;
      return;
    }
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [isSeller, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = unread > 0 ? `(${unread}) ${base}` : base;
  }, [unread]);

  const markRead = async (id) => {
    setNotifications((list) => list.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnread((n) => Math.max(0, n - 1));
    await api.markNotificationRead(id).catch(() => {});
  };

  const markAllRead = async () => {
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await api.markAllNotificationsRead().catch(() => {});
  };

  return (
    <NotificationsContext.Provider value={{ notifications, unread, refresh, markRead, markAllRead }}>
      {children}
      {toast && <Toast notification={toast} onClose={() => setToast(null)} />}
    </NotificationsContext.Provider>
  );
}

function Toast({ notification, onClose }) {
  const tab = notification.type === "LOW_STOCK" ? "products" : "orders";
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 w-[min(24rem,calc(100vw-2.5rem))] animate-[fade-up_420ms_var(--ease-out)] bg-ink p-5 text-cream shadow-[0_18px_40px_-12px_rgba(21,20,17,0.45)]"
    >
      <div className="flex items-start gap-3">
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-clay" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{notification.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-cream/75">{notification.body}</p>
          <Link
            to={`/seller?tab=${tab}`}
            onClick={onClose}
            className="mt-3 inline-block text-xs font-semibold text-cream underline underline-offset-4"
          >
            {tab === "orders" ? "Open orders" : "Open products"}
          </Link>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 flex h-7 w-7 items-center justify-center text-cream/60 hover:text-cream"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
