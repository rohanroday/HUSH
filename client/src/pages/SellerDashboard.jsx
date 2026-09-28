import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { formatPrice } from "../components/ProductCard";
import { StatusBadge, ORDER_STATUSES, STATUS_LABELS } from "../components/OrderStatus";

const TABS = [
  { key: "products", label: "My products" },
  { key: "add", label: "Add product" },
  { key: "orders", label: "Orders" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const MAX_IMAGES = 5;

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function totalStock(product) {
  return (product.sizes || []).reduce((n, s) => n + s.stock, 0);
}

export default function SellerDashboard() {
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "products";

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

  const stats = useMemo(() => {
    const live = orders.filter((o) => o.status !== "CANCELLED");
    return [
      { label: "Products", value: products.length },
      { label: "Published", value: products.filter((p) => p.isPublished).length },
      { label: "Orders to ship", value: orders.filter((o) => ["PLACED", "PENDING"].includes(o.status)).length },
      {
        label: "Revenue",
        value: `₹${live.reduce((n, o) => n + o.sellerTotal, 0).toLocaleString("en-IN")}`,
      },
    ];
  }, [products, orders]);

  if (loading) {
    return <p className="px-4 py-24 text-center text-sm text-stone">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Sign in to open your seller dashboard</h1>
        <Link
          to="/login"
          state={{ from: "/seller" }}
          className="mt-6 inline-block bg-ink px-6 py-3 text-sm font-semibold text-cream hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!isSeller) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Seller accounts only</h1>
        <p className="mt-2 text-sm text-stone">
          This dashboard is for sellers. You can track your own orders from your account.
        </p>
        <Link
          to="/profile?tab=orders"
          className="mt-6 inline-block bg-ink px-6 py-3 text-sm font-semibold text-cream hover:opacity-90"
        >
          View my orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-stone">Seller dashboard</p>
          <h1 className="font-display mt-1 text-3xl font-extrabold text-ink">Hi, {user.name}</h1>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-line p-4">
            <p className="text-xs text-stone">{s.label}</p>
            <p className="font-display mt-1 text-2xl font-extrabold text-ink">{loadingData ? "–" : s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSearchParams({ tab: t.key })}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm ${
              tab === t.key ? "border-ink font-semibold text-ink" : "border-transparent text-stone hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {error && <p className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {loadingData ? (
          <p className="text-sm text-stone">Loading…</p>
        ) : (
          <>
            {tab === "products" && (
              <ProductsPanel products={products} onChanged={loadProducts} onAdd={() => setSearchParams({ tab: "add" })} />
            )}
            {tab === "add" && (
              <div className="max-w-2xl">
                <ProductForm
                  onSaved={async () => {
                    await loadProducts();
                    setSearchParams({ tab: "products" });
                  }}
                />
              </div>
            )}
            {tab === "orders" && <SellerOrdersPanel orders={orders} onChanged={loadOrders} />}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- Products ---------------------------------- */

function ProductsPanel({ products, onChanged, onAdd }) {
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const shown = products.filter((p) =>
    filter === "all" ? true : filter === "published" ? p.isPublished : !p.isPublished
  );

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
      <div className="border border-line bg-cream-dark p-10 text-center">
        <p className="text-sm text-stone">You haven't added any products yet.</p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 bg-ink px-5 py-2.5 text-sm font-semibold text-cream hover:opacity-90"
        >
          Add your first product
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["all", "All"],
          ["published", "Published"],
          ["draft", "Drafts"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium ${
              filter === key ? "bg-ink text-cream" : "border border-line text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

      <ul className="divide-y divide-line border border-line">
        {shown.map((product) => {
          const stock = totalStock(product);
          const editing = editingId === product._id;
          return (
            <li key={product._id} className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-16 w-13 shrink-0 overflow-hidden bg-cream-dark">
                  {product.images?.[0]?.url && (
                    <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{product.title}</p>
                  <p className="mt-0.5 text-xs text-stone">
                    {formatPrice(product.price)} · {(product.category || []).join(", ")}
                  </p>
                  <p className={`mt-0.5 text-xs ${stock === 0 ? "text-red-700" : stock < 10 ? "text-clay" : "text-stone"}`}>
                    {stock === 0 ? "Out of stock" : `${stock} in stock`} ·{" "}
                    {product.sizes.map((s) => `${s.size}:${s.stock}`).join("  ")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    product.isPublished ? "bg-emerald-100 text-emerald-800" : "bg-cream-dark text-stone"
                  }`}
                >
                  {product.isPublished ? "Published" : "Draft"}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === product._id}
                    onClick={() => togglePublish(product)}
                    className="border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-ink disabled:opacity-50"
                  >
                    {product.isPublished ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(editing ? null : product._id)}
                    className="bg-ink px-3 py-1.5 text-xs font-medium text-cream hover:opacity-90"
                  >
                    {editing ? "Close" : "Edit"}
                  </button>
                </div>
              </div>

              {editing && (
                <div className="mt-4 border-t border-line pt-4">
                  <ProductForm
                    product={product}
                    onSaved={async () => {
                      await onChanged();
                      setEditingId(null);
                    }}
                    onImagesChanged={onChanged}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function initialForm(product) {
  const stockBySize = Object.fromEntries((product?.sizes || []).map((s) => [s.size, String(s.stock)]));
  return {
    title: product?.title || "",
    description: product?.description || "",
    amount: product ? String(product.price.amount) : "",
    currency: product?.price.currency || "INR",
    category: (product?.category || []).join(", "),
    sizes: Object.fromEntries(SIZES.map((s) => [s, stockBySize[s] ?? ""])),
    enabledSizes: Object.fromEntries(SIZES.map((s) => [s, s in stockBySize])),
  };
}

// Used both for creating a product and for editing an existing one.
function ProductForm({ product, onSaved, onImagesChanged }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState(() => initialForm(product));
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deletingImage, setDeletingImage] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const existingImages = product?.images || [];
  const slotsLeft = MAX_IMAGES - existingImages.length;
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pickFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles(picked.slice(0, slotsLeft));
    if (picked.length > slotsLeft) setError(`You can add at most ${slotsLeft} more image(s).`);
    e.target.value = "";
  };

  const deleteImage = async (imageKitId) => {
    setDeletingImage(imageKitId);
    setError("");
    try {
      await api.deleteImage(product._id, imageKitId);
      await onImagesChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingImage(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaved("");

    const sizes = SIZES.filter((s) => form.enabledSizes[s]).map((s) => ({
      size: s,
      stock: Number(form.sizes[s] || 0),
    }));
    const category = form.category
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (sizes.length === 0) return setError("Pick at least one size.");
    if (category.length === 0) return setError("Add at least one category.");
    if (!isEdit && files.length === 0) return setError("Add at least one image.");

    const data = new FormData();
    data.append("title", form.title.trim());
    data.append("description", form.description.trim());
    data.append("price", JSON.stringify({ amount: Number(form.amount), currency: form.currency }));
    data.append("category", JSON.stringify(category));
    data.append("sizes", JSON.stringify(sizes));
    files.forEach((f) => data.append("images", f));

    setSaving(true);
    try {
      if (isEdit) {
        await api.updateProduct(product._id, data);
        setSaved("Changes saved.");
      } else {
        await api.createProduct(data);
        setForm(initialForm());
        setSaved("Product created as a draft — publish it from My products.");
      }
      setFiles([]);
      await onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {!isEdit && (
        <div>
          <h2 className="text-lg font-semibold text-ink">New product</h2>
          <p className="mt-1 text-sm text-stone">
            New products start as drafts. Publish them when you're ready for customers to see them.
          </p>
        </div>
      )}

      <Input label="Title" value={form.title} onChange={set("title")} required minLength={3} maxLength={60} />

      <label className="block text-sm">
        <span className="mb-1.5 block text-xs font-medium text-stone">Description (10–200 characters)</span>
        <textarea
          value={form.description}
          onChange={set("description")}
          required
          minLength={10}
          maxLength={200}
          rows={3}
          className="w-full border border-line bg-cream px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Input label="Price" type="number" min="0" step="1" value={form.amount} onChange={set("amount")} required />
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-medium text-stone">Currency</span>
          <select
            value={form.currency}
            onChange={set("currency")}
            className="w-full border border-line bg-cream px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
          </select>
        </label>
      </div>

      <Input
        label="Categories (comma separated)"
        value={form.category}
        onChange={set("category")}
        placeholder="Men, T-Shirts"
        required
      />

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-stone">Sizes and stock</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {SIZES.map((s) => {
            const on = form.enabledSizes[s];
            return (
              <div key={s} className={`border p-2 ${on ? "border-ink" : "border-line"}`}>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, enabledSizes: { ...f.enabledSizes, [s]: e.target.checked } }))
                    }
                  />
                  {s}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  disabled={!on}
                  value={form.sizes[s]}
                  placeholder="0"
                  aria-label={`Stock for size ${s}`}
                  onChange={(e) => setForm((f) => ({ ...f, sizes: { ...f.sizes, [s]: e.target.value } }))}
                  className="mt-1.5 w-full border border-line bg-cream px-2 py-1 text-sm text-ink focus:border-ink focus:outline-none disabled:opacity-40"
                />
              </div>
            );
          })}
        </div>
      </fieldset>

      <div>
        <p className="mb-1.5 text-xs font-medium text-stone">
          Images ({existingImages.length + files.length}/{MAX_IMAGES})
        </p>
        <div className="flex flex-wrap gap-2">
          {existingImages.map((img) => (
            <div key={img.imageKitId} className="relative h-24 w-20 overflow-hidden bg-cream-dark">
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                disabled={deletingImage === img.imageKitId || existingImages.length + files.length <= 1}
                onClick={() => deleteImage(img.imageKitId)}
                aria-label="Delete image"
                title={existingImages.length <= 1 ? "A product needs at least one image" : "Delete image"}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-cream disabled:opacity-40"
              >
                ×
              </button>
            </div>
          ))}
          {previews.map((url, i) => (
            <div key={url} className="relative h-24 w-20 overflow-hidden bg-cream-dark ring-2 ring-clay">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                aria-label="Remove new image"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-cream"
              >
                ×
              </button>
            </div>
          ))}
          {slotsLeft - files.length > 0 && (
            <label className="flex h-24 w-20 cursor-pointer flex-col items-center justify-center border border-dashed border-line text-center text-[11px] text-stone hover:border-ink hover:text-ink">
              <span className="text-lg leading-none">+</span>
              Add
              <input type="file" accept="image/*" multiple onChange={pickFiles} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {saved && <p className="text-sm text-emerald-800">{saved}</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-ink px-6 py-3 text-sm font-semibold text-cream hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs font-medium text-stone">{label}</span>
      <input
        {...props}
        className="w-full border border-line bg-cream px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
      />
    </label>
  );
}

/* ----------------------------------- Orders ----------------------------------- */

function SellerOrdersPanel({ orders, onChanged }) {
  const [filter, setFilter] = useState("ALL");
  const shown = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  if (orders.length === 0) {
    return (
      <p className="border border-line bg-cream-dark p-10 text-center text-sm text-stone">
        No orders for your products yet.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {["ALL", ...ORDER_STATUSES].map((s) => {
          const count = s === "ALL" ? orders.length : orders.filter((o) => o.status === s).length;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium ${
                filter === s ? "bg-ink text-cream" : "border border-line text-ink"
              }`}
            >
              {s === "ALL" ? "All" : STATUS_LABELS[s]} ({count})
            </button>
          );
        })}
      </div>

      {shown.length === 0 && <p className="text-sm text-stone">No orders with this status.</p>}

      <ul className="space-y-4">
        {shown.map((order) => (
          <SellerOrderCard key={order._id} order={order} onChanged={onChanged} />
        ))}
      </ul>
    </div>
  );
}

function SellerOrderCard({ order, onChanged }) {
  const [status, setStatus] = useState(order.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const locked = order.status === "CANCELLED";

  const save = async () => {
    if (status === "CANCELLED" && !window.confirm("Cancel this order? Stock will be returned to your inventory.")) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.updateOrderStatus(order._id, status);
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const { address } = order;

  return (
    <li className="border border-line p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Order #{order._id.slice(-6).toUpperCase()}</p>
          <p className="text-xs text-stone">
            {formatDate(order.createdAt)}
            {order.customer && ` · ${order.customer.name} (${order.customer.email})`}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <ul className="mt-4 space-y-2">
        {order.products.map((p, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <div className="h-12 w-10 shrink-0 overflow-hidden bg-cream-dark">
              {p.product.image && <img src={p.product.image} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-ink">{p.product.title}</p>
              <p className="text-xs text-stone">
                Size {p.size} · Qty {p.quantity}
              </p>
            </div>
            <p className="text-ink">{formatPrice({ ...p.product.price, amount: p.product.price.amount * p.quantity })}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-4 border-t border-line pt-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-stone">Ship to</p>
          <p className="mt-1 text-ink">
            {address.house}, {address.street}
            <br />
            {address.city}, {address.state} {address.zip}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-medium text-stone">Your items total</p>
          <p className="font-display mt-1 text-lg font-extrabold text-ink">
            {formatPrice({ amount: order.sellerTotal, currency: order.totalPrice.currency })}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <label className="text-xs font-medium text-stone" htmlFor={`status-${order._id}`}>
          Update status
        </label>
        <select
          id={`status-${order._id}`}
          value={status}
          disabled={locked || saving}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-line bg-cream px-3 py-1.5 text-sm text-ink focus:border-ink focus:outline-none disabled:opacity-50"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={locked || saving || status === order.status}
          className="bg-ink px-4 py-1.5 text-sm font-medium text-cream hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {locked && <span className="text-xs text-stone">Cancelled orders can't be changed.</span>}
        {error && <span className="text-xs text-red-700">{error}</span>}
      </div>
    </li>
  );
}
