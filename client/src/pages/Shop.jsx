import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import ProductCard from "../components/ProductCard";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
const PAGE_SIZE = 12;
const MAX_PRICE = 5000;

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState(() => {
    const c = searchParams.get("category");
    return c ? [c] : [];
  });
  const [sizes, setSizes] = useState([]);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [sortBy, setSortBy] = useState("featured");
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Keep filters in sync when the navbar links change the URL.
  useEffect(() => {
    const c = searchParams.get("category");
    setCategories(c ? [c] : []);
    setQuery(searchParams.get("q") || "");
    setPage(1);
  }, [searchParams]);

  // Fetch every published product (backend has no server-side filtering).
  useEffect(() => {
    let active = true;
    async function loadAll() {
      setLoading(true);
      setError("");
      try {
        let current = 1;
        let total = 1;
        let all = [];
        do {
          const res = await api.getProducts(current);
          all = all.concat(res.data.products);
          total = res.data.totalPages || 1;
          current += 1;
        } while (current <= total);
        if (active) setAllProducts(all);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadAll();
    return () => {
      active = false;
    };
  }, []);

  // Build the category list from what's actually in the data, instead of a
  // guessed hardcoded list — so options always match real products.
  const categoryOptions = useMemo(() => {
    const set = new Set();
    allProducts.forEach((p) => (p.category || []).forEach((c) => set.add(c)));
    set.delete("Men");
    return Array.from(set).sort();
  }, [allProducts]);

  const toggle = (list, setList, value) => {
    setPage(1);
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const filtered = useMemo(() => {
    let result = allProducts;
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    if (categories.length) {
      const wanted = categories.map((c) => c.toLowerCase().trim());
      result = result.filter((p) =>
        p.category.some((c) => wanted.includes(c.toLowerCase().trim()))
      );
    }
    if (sizes.length) {
      result = result.filter((p) => p.sizes.some((s) => sizes.includes(s.size) && s.stock > 0));
    }
    // the slider's top stop means "any price", including pieces above it
    if (maxPrice < MAX_PRICE) {
      result = result.filter((p) => p.price.amount <= maxPrice);
    }

    const sorted = [...result];
    if (sortBy === "price-asc") sorted.sort((a, b) => a.price.amount - b.price.amount);
    if (sortBy === "price-desc") sorted.sort((a, b) => b.price.amount - a.price.amount);
    if (sortBy === "newest") sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sorted;
  }, [allProducts, query, categories, sizes, maxPrice, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeCount = categories.length + sizes.length + (maxPrice < MAX_PRICE ? 1 : 0) + (query ? 1 : 0);

  const clearAll = () => {
    setCategories([]);
    setSizes([]);
    setMaxPrice(MAX_PRICE);
    setQuery("");
    setSearchParams({});
    setPage(1);
  };

  const heading = query
    ? `“${query}”`
    : categories.length === 1
      ? categories[0]
      : "Everything";

  return (
    <div className="mx-auto max-w-360 px-4 pb-8 pt-10 sm:px-6 lg:px-10 lg:pt-14">
      <header className="mb-10 grid gap-6 border-b border-ink pb-8 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <h1 className="font-display text-6xl font-black uppercase leading-[0.85] text-ink sm:text-7xl lg:text-8xl">
            {heading}
          </h1>
          <p className="tabular mt-4 text-sm text-stone">
            {loading ? "Loading the collection…" : `${filtered.length} ${filtered.length === 1 ? "piece" : "pieces"}`}
          </p>
        </div>
        <form onSubmit={(e) => e.preventDefault()} role="search" className="md:col-span-4">
          <label className="relative block">
            <span className="sr-only">Search products</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4.2-4.2" />
            </svg>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or fabric"
              className="field pl-10!"
            />
          </label>
        </form>
      </header>

      {/* Category chips */}
      <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip active={categories.length === 0} onClick={() => { setCategories([]); setPage(1); }}>
          All
        </Chip>
        {categoryOptions.map((c) => (
          <Chip key={c} active={categories.includes(c)} onClick={() => toggle(categories, setCategories, c)}>
            {c}
          </Chip>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-14">
        {/* Filters */}
        <div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className="btn btn-outline w-full lg:hidden"
          >
            {filtersOpen ? "Hide filters" : `Filters & sort${activeCount ? ` (${activeCount})` : ""}`}
          </button>

          <aside className={`${filtersOpen ? "mt-6 block" : "hidden"} space-y-9 lg:sticky lg:top-24 lg:mt-0 lg:block`}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.16em] text-stone">Refine</p>
              {activeCount > 0 && (
                <button type="button" onClick={clearAll} className="link-draw text-xs font-medium text-ink">
                  Clear all
                </button>
              )}
            </div>

            <FilterGroup title="Sort by">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="field"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </FilterGroup>

            <FilterGroup title="Size">
              <div className="grid grid-cols-3 gap-2">
                {SIZE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={sizes.includes(s)}
                    onClick={() => toggle(sizes, setSizes, s)}
                    className={`h-10 border text-xs font-medium transition-colors duration-200 active:scale-95 ${
                      sizes.includes(s)
                        ? "border-ink bg-ink text-cream"
                        : "border-line bg-paper text-ink hover:border-ink"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup title="Max price">
              <input
                type="range"
                min={500}
                max={MAX_PRICE}
                step={100}
                value={maxPrice}
                aria-label="Maximum price"
                onChange={(e) => {
                  setMaxPrice(Number(e.target.value));
                  setPage(1);
                }}
                className="w-full"
              />
              <div className="tabular mt-3 flex justify-between text-xs text-stone">
                <span>₹500</span>
                <span className="font-medium text-ink">
                  {maxPrice >= MAX_PRICE ? "Any price" : `Up to ₹${maxPrice.toLocaleString("en-IN")}`}
                </span>
              </div>
            </FilterGroup>
          </aside>
        </div>

        {/* Grid */}
        <div>
          {error && (
            <p className="mb-6 border border-line bg-paper p-5 text-sm text-stone">
              We couldn't load the collection: {error}
            </p>
          )}

          {!loading && !error && allProducts.length === 0 && (
            <div className="border border-line bg-paper px-6 py-16 text-center">
              <p className="font-display text-3xl font-black uppercase text-ink">The first drop is coming</p>
              <p className="mt-2 text-sm text-stone">New pieces are being photographed right now. Check back soon.</p>
            </div>
          )}

          {!loading && !error && allProducts.length > 0 && filtered.length === 0 && (
            <div className="border border-line bg-paper px-6 py-16 text-center">
              <p className="font-display text-3xl font-black uppercase text-ink">Nothing matches, yet</p>
              <p className="mt-2 text-sm text-stone">Try a different size or widen the price range.</p>
              <button type="button" onClick={clearAll} className="btn btn-primary mt-6">
                Clear filters
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-5 xl:grid-cols-3">
            {loading &&
              Array.from({ length: 6 }, (_, i) => (
                <div key={i}>
                  <div className="aspect-4/5 animate-pulse bg-cream-dark" />
                  <div className="mt-4 h-3 w-2/3 animate-pulse bg-cream-dark" />
                  <div className="mt-2 h-3 w-1/3 animate-pulse bg-cream-dark" />
                </div>
              ))}
            {pageItems.map((p, i) => (
              <ProductCard key={p._id} product={p} index={i} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-current={n === page ? "page" : undefined}
                  onClick={() => {
                    setPage(n);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`tabular h-10 w-10 text-sm transition-colors duration-200 ${
                    n === page ? "bg-ink text-cream" : "text-ink hover:bg-cream-dark"
                  }`}
                >
                  {n}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors duration-200 active:scale-95 ${
        active ? "border-ink bg-ink text-cream" : "border-line bg-paper text-ink hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}

function FilterGroup({ title, children }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-ink">{title}</p>
      {children}
    </div>
  );
}
