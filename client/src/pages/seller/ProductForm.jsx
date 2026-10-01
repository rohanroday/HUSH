import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { Icon, SIZES } from "./shared";

const MAX_IMAGES = 5;

function initialForm(product) {
  const stockBySize = Object.fromEntries((product?.sizes || []).map((s) => [s.size, String(s.stock)]));
  return {
    title: product?.title || "",
    description: product?.description || "",
    amount: product ? String(product.price.amount) : "",
    category: (product?.category || []).join(", "),
    sizes: Object.fromEntries(SIZES.map((s) => [s, stockBySize[s] ?? ""])),
    enabledSizes: Object.fromEntries(SIZES.map((s) => [s, s in stockBySize])),
  };
}

// Used both for creating a product and for editing an existing one.
export default function ProductForm({ product, onSaved, onImagesChanged, onCancel, onDeleted }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState(() => initialForm(product));
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deletingImage, setDeletingImage] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const deleteProduct = async () => {
    setDeleting(true);
    setError("");
    try {
      await api.deleteProduct(product._id);
      await onDeleted?.();
    } catch (err) {
      setError(err.message);
      setConfirmingDelete(false);
      setDeleting(false);
    }
  };

  const existingImages = product?.images || [];
  const slotsLeft = MAX_IMAGES - existingImages.length;
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const addFiles = (list) => {
    const picked = Array.from(list || []).filter((f) => f.type.startsWith("image/"));
    const room = slotsLeft - files.length;
    setFiles((fs) => [...fs, ...picked.slice(0, room)]);
    if (picked.length > room) setError(`Only ${room} more image${room === 1 ? "" : "s"} fit (5 per product).`);
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

    if (sizes.length === 0) return setError("Turn on at least one size.");
    if (category.length === 0) return setError("Add at least one category.");
    if (category.some((c) => c.length < 2 || c.length > 20)) {
      return setError("Each category must be between 2 and 20 characters.");
    }
    if (!isEdit && files.length === 0) return setError("Add at least one photo.");

    const data = new FormData();
    data.append("title", form.title.trim());
    data.append("description", form.description.trim());
    data.append("price", JSON.stringify({ amount: Number(form.amount), currency: "INR" }));
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
        setSaved("Saved as a draft. Publish it from Products when you're ready.");
      }
      setFiles([]);
      await onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalStock = SIZES.reduce((n, s) => n + (form.enabledSizes[s] ? Number(form.sizes[s] || 0) : 0), 0);

  return (
    <form onSubmit={submit} className="space-y-8">
      <Section title="Details">
        <Input label="Product name" value={form.title} onChange={set("title")} required minLength={3} maxLength={60} placeholder="e.g. Heavyweight boxy tee" />
        <label className="block">
          <span className="mb-2 flex justify-between text-xs font-medium text-ink">
            Description
            <span className="tabular font-normal text-stone">{form.description.length}/200</span>
          </span>
          <textarea
            value={form.description}
            onChange={set("description")}
            required
            minLength={10}
            maxLength={200}
            rows={3}
            placeholder="Fabric, fit and what it pairs with."
            className="field resize-y"
          />
        </label>
        <Input
          label="Categories"
          hint="Separate with commas. Shoppers filter by these; the home page tiles use Jackets, T-Shirts, Hoodies, Shirts, Jeans and Joggers."
          value={form.category}
          onChange={set("category")}
          placeholder="Men, T-Shirts"
          required
        />
      </Section>

      <Section title="Price">
        <Input
          label="Selling price (₹, inclusive of taxes)"
          type="number"
          min="1"
          max="1000000"
          step="1"
          value={form.amount}
          onChange={set("amount")}
          required
          className="tabular"
        />
      </Section>

      <Section title="Sizes and stock" aside={<span className="tabular text-xs text-stone">{totalStock} units</span>}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {SIZES.map((s) => {
            const on = form.enabledSizes[s];
            return (
              <div key={s} className={`border bg-cream p-2 transition-colors ${on ? "border-ink" : "border-line"}`}>
                <label className="flex cursor-pointer items-center justify-between text-xs font-semibold text-ink">
                  {s}
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, enabledSizes: { ...f.enabledSizes, [s]: e.target.checked } }))
                    }
                    className="h-3.5 w-3.5 accent-[var(--color-ink)]"
                  />
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
                  className="tabular mt-2 w-full border-0 border-b border-line bg-transparent px-0 py-1 text-base text-ink focus:border-ink focus:outline-none disabled:opacity-30"
                />
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Photos" aside={<span className="tabular text-xs text-stone">{existingImages.length + files.length}/{MAX_IMAGES}</span>}>
        <div className="flex flex-wrap gap-2">
          {existingImages.map((img) => (
            <div key={img.imageKitId} className="group relative h-28 w-22 overflow-hidden bg-cream-dark">
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                disabled={deletingImage === img.imageKitId || existingImages.length <= 1}
                onClick={() => deleteImage(img.imageKitId)}
                aria-label="Delete photo"
                title={existingImages.length <= 1 ? "A product needs at least one photo" : "Delete photo"}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/85 text-cream disabled:hidden"
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
          {previews.map((url, i) => (
            <div key={url} className="relative h-28 w-22 overflow-hidden bg-cream-dark outline-2 -outline-offset-2 outline-clay">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                aria-label="Remove new photo"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/85 text-cream"
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
          {slotsLeft - files.length > 0 && (
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="flex h-28 min-w-22 flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 border border-dashed border-stone/50 bg-cream px-4 text-center text-xs text-stone transition-colors hover:border-ink hover:text-ink"
            >
              <Icon name="image" size={20} />
              <span>
                <span className="font-medium text-ink">Add photos</span> or drop them here
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
                className="sr-only"
              />
            </label>
          )}
        </div>
        {files.length > 0 && <p className="text-xs text-stone">New photos (outlined) upload when you save.</p>}
      </Section>

      {error && (
        <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {saved}
        </p>
      )}

      <div className="flex flex-wrap gap-3 border-t border-line pt-6">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-outline">
            {isEdit ? "Close" : "Cancel"}
          </button>
        )}
        {isEdit && onDeleted && !confirmingDelete && (
          <button type="button" onClick={() => setConfirmingDelete(true)} className="btn ml-auto text-red-800 hover:bg-red-50">
            Delete product
          </button>
        )}
      </div>

      {confirmingDelete && (
        <div className="border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-900">
            Delete this product and its photos for good? This can't be undone. To just hide it from the shop, unpublish it instead.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={deleting} onClick={deleteProduct} className="btn bg-red-800 px-4! py-2! text-paper hover:bg-red-900">
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button type="button" disabled={deleting} onClick={() => setConfirmingDelete(false)} className="btn btn-outline px-4! py-2!">
              Keep product
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function Section({ title, aside, children }) {
  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-baseline justify-between" aria-hidden="true">
        <span className="text-[11px] uppercase tracking-[0.16em] text-stone">{title}</span>
        {aside}
      </div>
      {children}
    </fieldset>
  );
}

function Input({ label, hint, className = "", ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-ink">{label}</span>
      <input {...props} className={`field ${className}`} />
      {hint && <span className="mt-1.5 block text-xs text-stone">{hint}</span>}
    </label>
  );
}
