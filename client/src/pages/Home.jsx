import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ProductCard, { formatPrice } from "../components/ProductCard";
import { CATEGORY_TILES, LOOKS, pexels, srcSet } from "../data/lookbook";

const TICKER = ["T-Shirts", "Overshirts", "Denim", "Hoodies", "Outerwear", "Joggers", "Polos", "Sweatshirts"];

const PROMISES = [
  {
    title: "Heavyweight, not heavy-handed",
    body: "Dense cottons and brushed fleece that hold their shape wash after wash, finished without loud branding.",
  },
  {
    title: "Cut to layer",
    body: "Relaxed shoulders, tapered legs and boxy tees sized to sit under an overshirt or over a hoodie.",
  },
  {
    title: "Seven days to decide",
    body: "Unworn pieces can go back within 7 days of delivery. Standard shipping is a flat ₹99.",
  },
];

function Photo({ look, sizes, className = "", imgClassName = "", eager = false, position }) {
  return (
    <img
      src={pexels(look.id, 1200)}
      srcSet={srcSet(look.id)}
      sizes={sizes}
      alt={look.alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      style={position ? { objectPosition: position } : undefined}
      className={`h-full w-full object-cover ${imgClassName} ${className}`}
    />
  );
}

function ArrowIcon({ className = "" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let page = 1;
        let total = 1;
        const all = [];
        do {
          const res = await api.getProducts(page);
          all.push(...res.data.products);
          total = res.data.totalPages || 1;
          page += 1;
        } while (page <= total);
        if (active) setProducts(all);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    const map = {};
    products.forEach((p) => (p.category || []).forEach((c) => (map[c] = (map[c] || 0) + 1)));
    return map;
  }, [products]);

  const newest = useMemo(
    () => [...products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10),
    [products]
  );

  const blackEdit = useMemo(() => products.filter((p) => /black/i.test(p.title)).slice(0, 4), [products]);

  return (
    <div>
      <Hero />
      <Ticker />
      <Categories counts={counts} loading={loading} />
      <NewArrivals products={newest} loading={loading} error={error} />
      <BlackEdit products={blackEdit} loading={loading} />
      <Promises />
      <Closer signedIn={Boolean(user)} />
    </div>
  );
}

/* ------------------------------------------------------------------ Hero */

function Hero() {
  return (
    <section className="relative mx-auto max-w-360 px-4 pb-16 pt-8 sm:px-6 lg:px-10 lg:pb-24 lg:pt-12">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col lg:col-span-5 lg:justify-center lg:gap-14 lg:pb-16">
          <h1 className="font-display text-[clamp(4rem,8.2vw,8.25rem)] font-black uppercase leading-[0.82] text-ink">
            <span className="block overflow-hidden pb-[0.04em]">
              <span className="hero-rise block" style={{ "--d": "250ms" }}>
                Quiet
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.04em]">
              <span className="hero-rise block" style={{ "--d": "340ms" }}>
                clothes.
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.04em]">
              <span className="hero-rise block text-clay" style={{ "--d": "430ms" }}>
                Worn loud.
              </span>
            </span>
          </h1>

          <div className="hero-fade mt-10 max-w-md lg:mt-0" style={{ "--d": "900ms" }}>
            <p className="text-base leading-relaxed text-ink-soft sm:text-lg">
              Heavyweight tees, overshirts, denim and outerwear in black, bone and stone. Nothing shouts,
              everything fits.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link to="/shop" className="btn btn-primary">
                Shop the collection
                <ArrowIcon className="btn-arrow" />
              </Link>
              <a href="#new" className="link-draw text-sm font-medium text-ink">
                See what's new
              </a>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="grid grid-cols-12 gap-3 sm:gap-4">
            <figure className="col-span-12 sm:col-span-7">
              <div className="hero-mask aspect-4/5 overflow-hidden bg-cream-dark" style={{ "--d": "0ms" }}>
                <Photo look={LOOKS.hoodiePair} eager sizes="(min-width: 1024px) 34vw, (min-width: 640px) 58vw, 100vw" />
              </div>
              <figcaption className="hero-fade mt-3 text-[11px] tracking-wide text-stone" style={{ "--d": "1100ms" }}>
                Pullover hoodies in black and bone
              </figcaption>
            </figure>

            <div className="col-span-12 grid grid-cols-2 gap-3 sm:col-span-5 sm:flex sm:flex-col sm:gap-4 sm:pt-20">
              <div className="hero-mask aspect-3/4 overflow-hidden bg-cream-dark" style={{ "--d": "160ms" }}>
                <Photo look={LOOKS.openShirt} eager sizes="(min-width: 1024px) 24vw, (min-width: 640px) 40vw, 50vw" />
              </div>
              <div className="hero-mask aspect-3/4 overflow-hidden bg-cream-dark sm:aspect-4/3" style={{ "--d": "320ms" }}>
                <Photo look={LOOKS.jacketDetail} sizes="(min-width: 1024px) 24vw, (min-width: 640px) 40vw, 50vw" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Ticker */

function Ticker() {
  const row = [...TICKER, ...TICKER];
  return (
    <div className="overflow-hidden border-y border-line bg-paper py-5" aria-hidden="true">
      <div className="animate-marquee flex w-max items-center gap-10 pr-10">
        {row.map((word, i) => (
          <span key={i} className="flex items-center gap-10">
            <span className="font-display text-3xl font-black uppercase text-ink sm:text-4xl">{word}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" className="text-clay" fill="currentColor">
              <path d="M11 2h2v7.6l5.4-5.4 1.4 1.4-5.4 5.4H22v2h-7.6l5.4 5.4-1.4 1.4-5.4-5.4V22h-2v-7.6l-5.4 5.4-1.4-1.4 5.4-5.4H2v-2h7.6L4.2 5.6l1.4-1.4 5.4 5.4z" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Categories */

function Categories({ counts, loading }) {
  return (
    <section className="mx-auto max-w-360 px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
      <div className="mb-10 grid gap-6 md:grid-cols-12 md:items-end" data-reveal>
        <h2 className="font-display text-6xl font-black uppercase leading-[0.85] text-ink md:col-span-7 lg:text-8xl">
          Find your uniform
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-stone md:col-span-5 md:justify-self-end">
          Six building blocks. Start with one, and everything else in the collection is cut to go with it.
        </p>
      </div>

      <div className="grid auto-rows-[15rem] grid-cols-2 gap-3 sm:gap-4 md:auto-rows-[19rem] md:grid-cols-12">
        {CATEGORY_TILES.map((tile, i) => (
          <Link
            key={tile.label}
            to={`/shop?category=${encodeURIComponent(tile.label)}`}
            className={`card-media group relative overflow-hidden bg-cream-dark ${tile.span} ${
              i === 0 ? "col-span-2 row-span-2" : i === 1 ? "col-span-2" : ""
            }`}
            data-reveal
            style={{ "--reveal-i": i % 3 }}
          >
            <Photo
              look={tile.look}
              position={tile.position}
              sizes="(min-width: 768px) 45vw, 100vw"
              className="absolute inset-0"
            />
            <div className="absolute inset-0 bg-linear-to-t from-ink/70 via-ink/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 sm:p-5">
              <div>
                <p className="font-display text-3xl font-black uppercase leading-none text-paper sm:text-4xl">
                  {tile.label}
                </p>
                <p className="tabular mt-1.5 text-xs text-paper/80">
                  {loading ? " " : `${counts[tile.label] || 0} pieces`}
                </p>
              </div>
              <span className="hidden h-10 w-10 items-center justify-center rounded-full bg-paper text-ink transition-transform duration-300 ease-out group-hover:-rotate-45 md:flex">
                <ArrowIcon />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- New arrivals */

function NewArrivals({ products, loading, error }) {
  const rail = useRef(null);
  const scroll = (dir) => {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section id="new" className="scroll-mt-24 border-t border-line bg-paper py-24 lg:py-28">
      <div className="mx-auto max-w-360 px-4 sm:px-6 lg:px-10">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6" data-reveal>
          <div>
            <h2 className="font-display text-6xl font-black uppercase leading-[0.85] text-ink lg:text-7xl">
              New this week
            </h2>
            <p className="mt-4 max-w-md text-sm text-stone">The latest pieces to land, straight from the studio rail.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/shop" className="link-draw mr-4 text-sm font-medium text-ink">
              Shop everything
            </Link>
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Scroll back"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink text-ink transition-colors duration-200 hover:bg-ink hover:text-cream active:scale-95"
            >
              <ArrowIcon className="rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Scroll forward"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink text-ink transition-colors duration-200 hover:bg-ink hover:text-cream active:scale-95"
            >
              <ArrowIcon />
            </button>
          </div>
        </div>

        {error && (
          <p className="border border-line p-6 text-sm text-stone">
            We couldn't load the collection just now. Refresh the page to try again.
          </p>
        )}

        <div
          ref={rail}
          className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 scrollbar-none sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:-mx-10 lg:scroll-px-10 lg:px-10"
        >
          {loading &&
            Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="w-[68vw] shrink-0 sm:w-[40vw] lg:w-[calc((100%-3rem)/4.3)]">
                <div className="aspect-4/5 animate-pulse bg-cream-dark" />
                <div className="mt-4 h-3 w-2/3 animate-pulse bg-cream-dark" />
                <div className="mt-2 h-3 w-1/3 animate-pulse bg-cream-dark" />
              </div>
            ))}
          {products.map((p, i) => (
            <div key={p._id} className="w-[68vw] shrink-0 snap-start sm:w-[40vw] lg:w-[calc((100%-3rem)/4.3)]">
              <ProductCard product={p} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Black edit */

function BlackEdit({ products, loading }) {
  return (
    <section className="mx-auto max-w-360 px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <div className="lg:sticky lg:top-24">
            <div className="card-media aspect-4/5 overflow-hidden bg-cream-dark" data-reveal>
              <Photo look={LOOKS.studioBack} sizes="(min-width: 1024px) 45vw, 100vw" position="center 30%" />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center lg:col-span-6">
          <h2 className="font-display text-6xl font-black uppercase leading-[0.85] text-ink lg:text-8xl" data-reveal>
            The black
            <br />
            edit
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-ink-soft" data-reveal>
            One colour, four textures. Black tees, joggers, fleece and faux leather that work together without
            any thought in the morning.
          </p>

          <ul className="mt-12 border-t border-ink">
            {loading &&
              Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="flex items-center gap-5 border-b border-line py-5">
                  <div className="h-24 w-20 animate-pulse bg-cream-dark" />
                  <div className="h-3 w-1/2 animate-pulse bg-cream-dark" />
                </li>
              ))}
            {products.map((p, i) => (
              <li key={p._id} data-reveal style={{ "--reveal-i": i }}>
                <Link
                  to={`/product/${p._id}`}
                  className="group flex items-center gap-5 border-b border-line py-5 transition-colors duration-200 hover:bg-paper"
                >
                  <div className="h-24 w-20 shrink-0 overflow-hidden bg-cream-dark">
                    {p.images?.[0]?.url && (
                      <img
                        src={p.images[0].url}
                        alt={p.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-stone">
                      {(p.category || []).filter((c) => c !== "Men").join(" · ")}
                    </p>
                    <p className="mt-1 truncate text-base font-medium text-ink">{p.title.replace(/^Men /, "")}</p>
                  </div>
                  <p className="tabular text-sm font-medium text-ink">{formatPrice(p.price)}</p>
                  <ArrowIcon className="mr-2 shrink-0 text-ink transition-transform duration-300 ease-out group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>

          <Link to="/shop?q=black" className="btn btn-outline mt-10 self-start">
            Shop all black
            <ArrowIcon className="btn-arrow" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Promises */

function Promises() {
  return (
    <section className="border-y border-line bg-cream-dark">
      <div className="mx-auto grid max-w-360 gap-12 px-4 py-24 sm:px-6 lg:grid-cols-12 lg:px-10 lg:py-28">
        <h2 className="font-display text-5xl font-black uppercase leading-[0.85] text-ink lg:col-span-4 lg:text-6xl" data-reveal>
          Fewer,
          <br />
          better pieces
        </h2>
        <dl className="grid gap-10 sm:grid-cols-3 lg:col-span-8">
          {PROMISES.map((item, i) => (
            <div key={item.title} className="border-t border-ink pt-5" data-reveal style={{ "--reveal-i": i }}>
              <dt className="text-base font-semibold text-ink">{item.title}</dt>
              <dd className="mt-3 text-sm leading-relaxed text-stone">{item.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- Closer */

function Closer({ signedIn }) {
  return (
    <section className="mx-auto max-w-360 px-4 pt-24 sm:px-6 lg:px-10 lg:pt-32">
      <div className="card-media relative min-h-[34rem] overflow-hidden bg-ink" data-reveal>
        <Photo look={LOOKS.whiteTees} sizes="100vw" className="absolute inset-0" position="center 30%" />
        <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/35 to-ink/10" />
        <div className="relative flex min-h-[34rem] flex-col justify-end p-6 sm:p-10 lg:p-14">
          <h2 className="font-display max-w-3xl text-6xl font-black uppercase leading-[0.85] text-paper sm:text-7xl lg:text-8xl">
            Start with a white tee
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-paper/85">
            {signedIn
              ? "Your bag and order history are waiting. Pick up where you left off."
              : "Create an account to save your bag, check out faster and follow every order from studio to door."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {signedIn ? (
              <Link to="/shop?category=T-Shirts" className="btn btn-light">
                Shop tees
                <ArrowIcon className="btn-arrow" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-light">
                  Create an account
                  <ArrowIcon className="btn-arrow" />
                </Link>
                <Link to="/shop?category=T-Shirts" className="btn border border-paper/60 text-paper hover:bg-paper hover:text-ink">
                  Shop tees
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
