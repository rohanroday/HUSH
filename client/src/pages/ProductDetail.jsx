import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useProducts } from "../context/ProductsContext";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import ProductCard, { formatPrice } from "../components/ProductCard";
import { api } from "../api/client";

export default function ProductDetail() {
  const { id } = useParams();
  const { getById } = useProducts();
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [adding, setAdding] = useState(false);
  const [related, setRelated] = useState([]);
  const rail = useRef(null);

  useEffect(() => {
    let active = true;
    setProduct(null);
    setNotFound(false);
    setActiveImage(0);
    setQty(1);
    setStatus({ type: "", message: "" });
    getById(id).then((p) => {
      if (!active) return;
      if (p) {
        setProduct(p);
        setSize(p.sizes.find((s) => s.stock > 0)?.size ?? p.sizes[0]?.size ?? null);
      } else {
        setNotFound(true);
      }
    });
    return () => {
      active = false;
    };
  }, [id, getById]);

  // "Pairs well with": other published pieces sharing a category.
  useEffect(() => {
    if (!product) return;
    let active = true;
    const cats = product.category.filter((c) => c !== "Men");
    api
      .getProducts(1)
      .then((res) => {
        if (!active) return;
        const others = res.data.products.filter((p) => p._id !== product._id);
        const same = others.filter((p) => p.category.some((c) => cats.includes(c)));
        setRelated([...same, ...others.filter((p) => !same.includes(p))].slice(0, 4));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [product]);

  const selectedSize = product?.sizes.find((s) => s.size === size);

  const handleAddToCart = async () => {
    if (!user) {
      navigate("/login", { state: { from: `/product/${id}` } });
      return;
    }
    if (!size) {
      setStatus({ type: "error", message: "Choose a size first." });
      return;
    }
    setAdding(true);
    setStatus({ type: "", message: "" });
    try {
      await addItem(product._id, size, qty);
      setStatus({ type: "success", message: `Added ${qty} × size ${size} to your bag.` });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setAdding(false);
    }
  };

  const onRailScroll = () => {
    const el = rail.current;
    if (el) setActiveImage(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (notFound) {
    return (
      <div className="mx-auto max-w-360 px-4 py-28 sm:px-6 lg:px-10">
        <h1 className="font-display text-6xl font-black uppercase leading-[0.85] text-ink">Sold through</h1>
        <p className="mt-4 max-w-md text-sm text-stone">
          This piece has been unpublished or removed. Plenty more where it came from.
        </p>
        <Link to="/shop" className="btn btn-primary mt-8">
          Back to the shop
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto grid max-w-360 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:px-10">
        <div className="aspect-4/5 animate-pulse bg-cream-dark lg:col-span-7" />
        <div className="space-y-4 lg:col-span-5">
          <div className="h-3 w-1/4 animate-pulse bg-cream-dark" />
          <div className="h-12 w-3/4 animate-pulse bg-cream-dark" />
          <div className="h-4 w-1/5 animate-pulse bg-cream-dark" />
        </div>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [{ url: null }];
  const title = product.title.replace(/^Men /, "");
  const cats = product.category.filter((c) => c !== "Men");
  const lowStock = selectedSize && selectedSize.stock > 0 && selectedSize.stock <= 5;

  return (
    <div className="mx-auto max-w-360 px-4 pb-8 pt-6 sm:px-6 lg:px-10">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap gap-2 text-xs text-stone">
        <Link to="/" className="link-draw hover:text-ink">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/shop" className="link-draw hover:text-ink">Shop</Link>
        {cats[0] && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`/shop?category=${encodeURIComponent(cats[0])}`} className="link-draw hover:text-ink">
              {cats[0]}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        {/* Gallery: swipe rail on mobile, stacked editorial frames on desktop */}
        <div className="lg:col-span-7">
          <div
            ref={rail}
            onScroll={onRailScroll}
            className="-mx-4 flex snap-x snap-mandatory overflow-x-auto scrollbar-none sm:-mx-6 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:overflow-visible"
          >
            {images.map((img, i) => (
              <div
                key={i}
                className={`aspect-4/5 w-full shrink-0 snap-center overflow-hidden bg-cream-dark ${
                  i === 0 || (i === images.length - 1 && images.length % 2 === 0) ? "lg:col-span-2" : ""
                }`}
              >
                {img.url ? (
                  <img
                    src={img.url}
                    alt={i === 0 ? title : `${title}, view ${i + 1}`}
                    loading={i === 0 ? "eager" : "lazy"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-stone">No image yet</div>
                )}
              </div>
            ))}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ease-out ${
                    i === activeImage ? "w-6 bg-ink" : "w-1.5 bg-line"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <p className="text-[11px] uppercase tracking-[0.16em] text-stone">{cats.join(" · ")}</p>
            <h1 className="font-display mt-3 text-5xl font-black uppercase leading-[0.88] text-ink sm:text-6xl">
              {title}
            </h1>
            <p className="tabular mt-5 text-2xl font-medium text-ink">{formatPrice(product.price)}</p>
            <p className="mt-1 text-xs text-stone">Inclusive of all taxes. Shipping calculated at checkout.</p>

            <p className="mt-7 max-w-md text-[15px] leading-relaxed text-ink-soft">{product.description}</p>

            <div className="mt-9">
              <div className="mb-3 flex items-baseline justify-between">
                <p className="text-sm font-semibold text-ink">Size</p>
                <p className={`text-xs ${lowStock ? "font-medium text-clay" : "text-stone"}`}>
                  {!selectedSize
                    ? "Choose a size"
                    : selectedSize.stock === 0
                      ? "Sold out in this size"
                      : lowStock
                        ? `Only ${selectedSize.stock} left in ${selectedSize.size}`
                        : "In stock"}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {product.sizes.map((s) => (
                  <button
                    key={s.size}
                    type="button"
                    disabled={s.stock === 0}
                    aria-pressed={size === s.size}
                    onClick={() => {
                      setSize(s.size);
                      setQty(1);
                    }}
                    className={`h-12 border text-sm font-medium transition-colors duration-200 active:scale-95 ${
                      size === s.size
                        ? "border-ink bg-ink text-cream"
                        : s.stock === 0
                          ? "cursor-not-allowed border-line text-stone/60 line-through"
                          : "border-line bg-paper text-ink hover:border-ink"
                    }`}
                  >
                    {s.size}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-stretch gap-3">
              <div className="flex items-center border border-line bg-paper">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-full w-11 items-center justify-center text-lg text-ink disabled:opacity-30"
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="tabular w-8 text-center text-sm" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(selectedSize?.stock ?? 99, q + 1))}
                  className="flex h-full w-11 items-center justify-center text-lg text-ink disabled:opacity-30"
                  disabled={qty >= (selectedSize?.stock ?? 99)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                disabled={adding || !selectedSize || selectedSize.stock === 0}
                onClick={handleAddToCart}
                className="btn btn-primary flex-1 py-4!"
              >
                {adding ? "Adding…" : selectedSize?.stock === 0 ? "Sold out" : user ? "Add to bag" : "Sign in to add to bag"}
              </button>
            </div>

            <div aria-live="polite" className="min-h-6">
              {status.message && (
                <p className={`mt-3 text-sm ${status.type === "error" ? "text-red-800" : "text-ink"}`}>
                  {status.message}{" "}
                  {status.type === "success" && (
                    <Link to="/cart" className="font-medium underline underline-offset-4">
                      View bag
                    </Link>
                  )}
                </p>
              )}
            </div>

            <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
              {[
                ["Delivery", "Flat ₹99 standard shipping, usually 4–6 business days."],
                ["Returns", "Send unworn pieces back within 7 days of delivery."],
              ].map(([term, detail]) => (
                <div key={term} className="grid grid-cols-[96px_1fr] gap-4 py-4">
                  <dt className="font-medium text-ink">{term}</dt>
                  <dd className="text-stone">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-28 border-t border-ink pt-10">
          <h2 className="font-display text-5xl font-black uppercase leading-[0.85] text-ink" data-reveal>
            Pairs well with
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-5 lg:grid-cols-4">
            {related.map((p, i) => (
              <ProductCard key={p._id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
