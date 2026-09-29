import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import Overview from "./Overview";
import Orders from "./Orders";
import Products from "./Products";
import ProductForm from "./ProductForm";
import Alerts from "./Alerts";
import { Icon, Panel } from "./shared";

const SECTIONS = [
  { key: "overview", label: "Overview", icon: "overview", title: "Overview" },
  { key: "orders", label: "Orders", icon: "orders", title: "Orders" },
  { key: "products", label: "Products", icon: "products", title: "Products" },
  { key: "add", label: "Add product", icon: "add", title: "New product" },
  { key: "alerts", label: "Notifications", icon: "alerts", title: "Notifications" },
];

export default function SellerDashboard() {
  const { user, loading } = useAuth();
  const { notifications, unread } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = SECTIONS.some((s) => s.key === searchParams.get("tab")) ? searchParams.get("tab") : "overview";
  const section = SECTIONS.find((s) => s.key === tab);

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  const isSeller = user?.role === "seller";

  const loadProducts = useCallback(async () => {
    const all = [];
    let page = 1;
    let totalPages = 1;
    do {
      const res = await api.getSellerProducts(page, 50);
      all.push(...res.data.products);
      totalPages = res.data.totalPages;
      page += 1;
    } while (page <= totalPages);
    setProducts(all);
  }, []);

  const loadOrders = useCallback(async () => {
    const res = await api.getSellerOrders();
    setOrders(res.data.orders);
  }, []);

  useEffect(() => {
    if (!isSeller) return;
    let active = true;
    Promise.all([loadProducts(), loadOrders()])
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoadingData(false));
    return () => {
      active = false;
    };
  }, [isSeller, loadProducts, loadOrders]);

  // A new alert usually means a new order or a stock change: pull fresh data.
  const latestAlert = notifications[0]?._id;
  useEffect(() => {
    if (!isSeller || !latestAlert) return;
    loadOrders().catch(() => {});
    loadProducts().catch(() => {});
  }, [isSeller, latestAlert, loadOrders, loadProducts]);

  const open = (key) => setSearchParams({ tab: key });

  if (loading) {
    return <p className="px-4 py-24 text-center text-sm text-stone">Loading…</p>;
  }

  if (!user || !isSeller) {
    return (
      <div className="mx-auto max-w-360 px-4 py-24 sm:px-6 lg:px-10">
        <h1 className="font-display text-6xl font-black uppercase leading-[0.85] text-ink">Seller studio</h1>
        <p className="mt-4 max-w-md text-sm text-stone">
          {user
            ? "This area is for seller accounts. Your own orders live in your account."
            : "Sign in with your seller account to manage products and orders."}
        </p>
        <Link
          to={user ? "/profile?tab=orders" : "/login"}
          state={user ? undefined : { from: "/seller" }}
          className="btn btn-primary mt-8"
        >
          {user ? "View my orders" : "Sign in"}
        </Link>
      </div>
    );
  }

  const toShip = orders.filter((o) => o.status === "PLACED" || o.status === "PENDING").length;
  const requests = orders.filter((o) => o.cancellationRequest?.status === "REQUESTED").length;
  const badges = { orders: toShip + requests, alerts: unread };

  return (
    <div className="mx-auto grid max-w-360 grid-cols-[minmax(0,1fr)] gap-6 px-4 pb-8 pt-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:px-10 lg:pt-10">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:h-fit">
        <div className="hidden lg:block">
          <p className="text-[11px] uppercase tracking-[0.16em] text-stone">Seller studio</p>
          <p className="mt-1 truncate text-base font-semibold text-ink">{user.name}</p>
        </div>
        <nav aria-label="Seller sections" className="-mx-4 flex gap-1 overflow-x-auto px-4 scrollbar-none sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-6 lg:flex-col lg:px-0">
          {SECTIONS.map((s) => {
            const active = s.key === tab;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => open(s.key)}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-150 ${
                  active ? "bg-ink text-cream" : "text-ink hover:bg-paper"
                }`}
              >
                <Icon name={s.icon} />
                <span className="flex-1 text-left">{s.label}</span>
                {badges[s.key] > 0 && (
                  <span
                    className={`tabular min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold ${
                      active ? "bg-cream text-ink" : "bg-clay text-paper"
                    }`}
                  >
                    {badges[s.key]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl font-black uppercase leading-[0.85] text-ink sm:text-6xl">{section.title}</h1>
            {tab === "overview" && (
              <p className="mt-3 text-sm text-stone">
                {[
                  requests > 0 && `${requests} cancellation ${requests === 1 ? "request needs" : "requests need"} your answer.`,
                  toShip > 0 && `${toShip} paid ${toShip === 1 ? "order is" : "orders are"} waiting to be packed.`,
                ]
                  .filter(Boolean)
                  .join(" ") || "You're all caught up."}
              </p>
            )}
          </div>
          {tab !== "add" && (
            <button type="button" onClick={() => open("add")} className="btn btn-primary">
              <Icon name="add" size={16} />
              New product
            </button>
          )}
        </header>

        {error && <p className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>}

        {loadingData ? (
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]" aria-busy="true">
            <div className="h-80 animate-pulse bg-paper" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-36 animate-pulse bg-paper" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {tab === "overview" && (
              <Overview orders={orders} products={products} notifications={notifications} onOpen={open} />
            )}
            {tab === "orders" && <Orders orders={orders} onChanged={() => Promise.all([loadOrders(), loadProducts()])} />}
            {tab === "products" && <Products products={products} onChanged={loadProducts} onAdd={() => open("add")} />}
            {tab === "add" && (
              <Panel className="max-w-3xl p-6 sm:p-8">
                <ProductForm
                  onSaved={async () => {
                    await loadProducts();
                  }}
                  onCancel={() => open("products")}
                />
              </Panel>
            )}
            {tab === "alerts" && <Alerts />}
          </>
        )}
      </div>
    </div>
  );
}
