import { Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";

function formatPrice(price) {
  if (!price) return "";
  const symbol = price.currency === "USD" ? "$" : "₹";
  return `${symbol}${price.amount.toLocaleString("en-IN")}`;
}

export default function ProductCard({ product, index = 0 }) {
  const wishlist = useWishlist();
  const wished = wishlist.has(product._id);
  const [cover, alt] = [product.images?.[0]?.url, product.images?.[1]?.url];
  const stock = (product.sizes || []).reduce((n, s) => n + s.stock, 0);
  const sizes = (product.sizes || []).filter((s) => s.stock > 0).map((s) => s.size);
  const category = (product.category || []).find((c) => c.toLowerCase() !== "men") || product.category?.[0];

  return (
    <article className="group" data-reveal style={{ "--reveal-i": index % 4 }}>
      <div className="card-media relative aspect-4/5 overflow-hidden bg-cream-dark">
        <Link to={`/product/${product._id}`} aria-label={product.title} className="block h-full w-full">
          {cover ? (
            <>
              <img
                src={cover}
                alt={product.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              {alt && (
                <img
                  src={alt}
                  alt=""
                  loading="lazy"
                  className="card-alt absolute inset-0 h-full w-full object-cover opacity-0"
                />
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-stone">No image yet</div>
          )}
        </Link>

        {stock > 0 && stock <= 20 && (
          <span className="pointer-events-none absolute left-3 top-3 bg-paper px-2 py-1 text-[11px] font-medium text-ink">
            Only {stock} left
          </span>
        )}
        {stock === 0 && (
          <span className="pointer-events-none absolute left-3 top-3 bg-ink px-2 py-1 text-[11px] font-medium text-cream">
            Sold out
          </span>
        )}

        <button
          type="button"
          aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={wished}
          onClick={() => wishlist.toggle(product._id)}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-paper/90 text-ink backdrop-blur transition-transform duration-150 ease-[var(--ease-out)] active:scale-90"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={wished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M12 20s-7-4.4-9.5-8.8C.9 8 2 4.5 5.5 4c2-.3 3.7.8 6.5 3.5C14.8 4.8 16.5 3.7 18.5 4c3.5.5 4.6 4 3 7.2C19 15.6 12 20 12 20Z" />
          </svg>
        </button>

        {sizes.length > 0 && (
          <p className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-2 bg-paper/95 px-3 py-2 text-[11px] tracking-wide text-ink opacity-0 transition-all duration-300 ease-[var(--ease-out)] group-hover:translate-y-0 group-hover:opacity-100">
            Sizes · {sizes.join("  ")}
          </p>
        )}
      </div>

      <Link to={`/product/${product._id}`} className="mt-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {category && <p className="text-[11px] uppercase tracking-[0.14em] text-stone">{category}</p>}
          <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-ink">
            {product.title.replace(/^Men /, "")}
          </h3>
        </div>
        <p className="tabular shrink-0 text-sm font-medium text-ink">{formatPrice(product.price)}</p>
      </Link>
    </article>
  );
}

export { formatPrice };
