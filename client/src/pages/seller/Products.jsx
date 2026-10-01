import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import ProductForm from "./ProductForm";
import { cleanTitle, Icon, LOW_STOCK, money, SIZES } from "./shared";

const FILTERS = [
  ["all", "All"],
  ["live", "Live"],
  ["draft", "Drafts"],
  ["low", "Needs restock"],
];

const SORTS = {
  newest: ["Newest first", (a, b) => new Date(b.createdAt) - new Date(a.createdAt)],
  stock: ["Lowest stock first", (a, b) => units(a) - units(b)],
  priceHigh: ["Price: high to low", (a, b) => b.price.amount - a.price.amount],
  priceLow: ["Price: low to high", (a, b) => a.price.amount - b.price.amount],
  name: ["Name A–Z", (a, b) => cleanTitle(a.title).localeCompare(cleanTitle(b.title))],
};

function units(product) {
  return product.sizes.reduce((n, s) => n + s.stock, 0);
}

function lowSizes(product) {
  return product.sizes.filter((s) => s.stock <= LOW_STOCK);
}

export default function Products({ products, onChanged, onAdd }) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const editing = products.find((p) => p._id === editingId) || null;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => {
        if (filter === "live" && !p.isPublished) return false;
        if (filter === "draft" && p.isPublished) return false;
        if (filter === "low" && lowSizes(p).length === 0) return false;
        return !q || p.title.toLowerCase().includes(q) || p.category.join(" ").toLowerCase().includes(q);
      })
      .sort(SORTS[sort][1]);
  }, [products, filter, query, sort]);

  const counts = {
    all: products.length,
    live: products.filter((p) => p.isPublished).length,
    draft: products.filter((p) => !p.isPublished).length,
    low: products.filter((p) => lowSizes(p).length > 0).length,
  };
  const totalUnits = products.reduce((n, p) => n + units(p), 0);
  const stockValue = products.reduce((n, p) => n + units(p) * p.price.amount, 0);

  const togglePublish = async (product) => {
    setBusyId(product._id);
    setError("");
    try {
      await api.togglePublish(product._id);
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (products.length === 0) {
    return (
      <div className="bg-paper px-6 py-20 text-center">
        <p className="font-display text-4xl font-black uppercase text-ink">No products yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-stone">
          Add your first piece. It starts as a draft, so nothing goes live until you publish it.
        </p>
        <button type="button" onClick={onAdd} className="btn btn-primary mt-6">
          Add a product
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Inventory at a glance */}
      <dl className="mb-6 grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {[
          ["Products", counts.all],
          ["Live in the shop", `${counts.live}`],
          ["Units in stock", totalUnits.toLocaleString("en-IN")],
          ["Stock value", money(stockValue)],
        ].map(([label, value]) => (
          <div key={label} className="bg-paper px-5 py-4">
            <dt className="text-xs text-stone">{label}</dt>
            <dd className="tabular font-display mt-1 text-2xl font-black text-ink sm:text-3xl">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-150 ${
                filter === key ? "bg-ink text-cream" : "bg-paper text-ink hover:bg-cream-dark"
              }`}
            >
              {key === "low" && counts.low > 0 && <span className="h-1.5 w-1.5 rounded-full bg-clay" aria-hidden="true" />}
              {label}
              <span className="tabular opacity-55">{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
            <span className="sr-only">Search products</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone">
              <Icon name="search" size={15} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or category"
              className="field py-2.5! pl-9!"
            />
          </label>
          <label className="shrink-0">
            <span className="sr-only">Sort products</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="field w-auto! py-2.5!">
              {Object.entries(SORTS).map(([key, [label]]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && <p className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p>}

      {shown.length === 0 ? (
        <div className="bg-paper px-6 py-16 text-center">
          <p className="text-sm text-stone">No products match.</p>
          {(query || filter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="mt-3 text-sm font-medium text-ink underline underline-offset-4"
            >
              Show everything
            </button>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              busy={busyId === product._id}
              onToggle={() => togglePublish(product)}
              onEdit={() => setEditingId(product._id)}
            />
          ))}
          <li>
            <button
              type="button"
              onClick={onAdd}
              className="flex h-full min-h-72 w-full flex-col items-center justify-center gap-3 border border-dashed border-stone/40 text-stone transition-colors duration-200 hover:border-ink hover:bg-paper hover:text-ink"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper">
                <Icon name="add" size={20} />
              </span>
              <span className="text-sm font-medium">Add a product</span>
            </button>
          </li>
        </ul>
      )}

      {editing && (
        <Drawer title={`Edit ${cleanTitle(editing.title)}`} onClose={() => setEditingId(null)}>
          <ProductForm
            key={editing._id}
            product={editing}
            onSaved={onChanged}
            onImagesChanged={onChanged}
            onCancel={() => setEditingId(null)}
            onDeleted={async () => {
              setEditingId(null);
              await onChanged();
            }}
          />
        </Drawer>
      )}
    </div>
  );
}

function ProductCard({ product, busy, onToggle, onEdit }) {
  const title = cleanTitle(product.title);
  const total = units(product);
  const low = lowSizes(product);
  const soldOut = product.sizes.filter((s) => s.stock === 0).length;
  const peak = Math.max(10, ...product.sizes.map((s) => s.stock));
  const [cover, alt] = [product.images?.[0]?.url, product.images?.[1]?.url];
  const categories = product.category.filter((c) => c !== "Men");

  return (
    <li className="group flex flex-col bg-paper transition-shadow duration-300 hover:shadow-[0_20px_40px_-28px_rgba(21,20,17,0.5)]">
      <button type="button" onClick={onEdit} className="card-media relative block aspect-4/3 overflow-hidden bg-cream-dark text-left" aria-label={`Edit ${title}`}>
        {cover ? (
          <>
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover object-[center_25%]" />
            {alt && <img src={alt} alt="" className="card-alt absolute inset-0 h-full w-full object-cover object-[center_25%] opacity-0" />}
          </>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-stone">
            <Icon name="image" size={28} />
          </span>
        )}
        <span className="absolute left-3 top-3 flex items-center gap-1.5 bg-paper/95 px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur">
          <span className={`h-1.5 w-1.5 rounded-full ${product.isPublished ? "bg-emerald-600" : "bg-stone"}`} aria-hidden="true" />
          {product.isPublished ? "Live" : "Draft"}
        </span>
        {low.length > 0 && (
          <span className="absolute right-3 top-3 bg-clay px-2.5 py-1 text-[11px] font-semibold text-paper">
            {soldOut > 0 ? `${soldOut} size${soldOut > 1 ? "s" : ""} sold out` : `${low.length} size${low.length > 1 ? "s" : ""} low`}
          </span>
        )}
        <span className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-center gap-2 bg-ink/90 py-2.5 text-xs font-semibold text-cream opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          Edit details, stock &amp; photos
        </span>
      </button>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-[11px] uppercase tracking-[0.14em] text-stone">{categories.join(" · ") || "Uncategorised"}</p>
            <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-ink">{title}</h3>
          </div>
          <p className="tabular shrink-0 text-base font-semibold text-ink">{money(product.price.amount, product.price.currency)}</p>
        </div>

        <div className="mb-5 mt-5">
          <div className="mb-2 flex items-baseline justify-between text-xs">
            <span className="text-stone">Stock by size</span>
            <span className="tabular font-medium text-ink">{total} units</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5" role="list" aria-label={`Stock for ${title}`}>
            {SIZES.map((size) => {
              const s = product.sizes.find((x) => x.size === size);
              if (!s) {
                return (
                  <div key={size} role="listitem" className="flex flex-col items-center gap-1 opacity-35" aria-label={`${size}: not offered`}>
                    <div className="flex h-10 w-full items-end justify-center border-b border-line" />
                    <span className="text-[10px] font-medium text-stone">{size}</span>
                  </div>
                );
              }
              const level = s.stock === 0 ? "bg-red-700" : s.stock <= LOW_STOCK ? "bg-clay" : "bg-ink";
              return (
                <div key={size} role="listitem" className="flex flex-col items-center gap-1" aria-label={`${size}: ${s.stock} in stock`} title={`${size}: ${s.stock} in stock`}>
                  <div className="flex h-10 w-full items-end justify-center border-b border-line">
                    <div
                      className={`w-3.5 rounded-t-[3px] ${level}`}
                      style={{ height: s.stock ? `${Math.max(10, (s.stock / peak) * 100)}%` : 0 }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-stone">{size}</span>
                  <span
                    className={`tabular text-xs font-semibold ${
                      s.stock === 0 ? "text-red-800" : s.stock <= LOW_STOCK ? "text-clay" : "text-ink"
                    }`}
                  >
                    {s.stock}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
          <button
            type="button"
            role="switch"
            aria-checked={product.isPublished}
            aria-label={`${product.isPublished ? "Unpublish" : "Publish"} ${title}`}
            disabled={busy}
            onClick={onToggle}
            className="flex items-center gap-2.5 text-[13px] font-medium text-ink disabled:opacity-50"
          >
            <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${product.isPublished ? "bg-emerald-700" : "bg-line"}`}>
              <span
                className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-paper shadow-sm transition-transform duration-200 ease-out ${
                  product.isPublished ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </span>
            {busy ? "Saving…" : product.isPublished ? "In the shop" : "Hidden"}
          </button>
          <div className="flex items-center gap-1">
            {product.isPublished && (
              <Link
                to={`/product/${product._id}`}
                className="px-2.5 py-1.5 text-xs font-medium text-stone transition-colors hover:text-ink"
              >
                View
              </Link>
            )}
            <button
              type="button"
              onClick={onEdit}
              className="btn btn-outline px-3.5! py-1.5! text-xs!"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function Drawer({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 animate-[fade-up_200ms_ease-out] bg-ink/40" />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xl animate-[drawer-in_420ms_var(--ease-drawer)] flex-col bg-cream shadow-[-24px_0_48px_-24px_rgba(21,20,17,0.35)]">
        <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
          <h2 className="truncate text-base font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close editor" className="flex h-9 w-9 items-center justify-center text-ink hover:bg-cream-dark">
            <Icon name="close" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
