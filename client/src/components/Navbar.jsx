import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const NAV_LINKS = [
  { to: "/shop", label: "Shop all" },
  { to: "/shop?category=Jackets", label: "Outerwear" },
  { to: "/shop?category=T-Shirts", label: "Tees" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

function isLinkActive(link, location) {
  const [path, query] = link.to.split("?");
  if (location.pathname !== path) return false;
  if (!query) return !location.search.includes("category=");
  return location.search.includes(query);
}

function IconButton({ children, onClick, to, label, badge }) {
  const cls =
    "relative flex h-10 w-10 items-center justify-center text-ink transition-opacity duration-200 hover:opacity-60";
  const content = (
    <>
      {children}
      {badge > 0 && (
        <span
          key={badge}
          className="tabular absolute right-0.5 top-0.5 flex h-4 min-w-4 animate-[fade-up_400ms_var(--ease-out)] items-center justify-center rounded-full bg-clay px-1 text-[10px] font-semibold text-paper"
        >
          {badge}
        </span>
      )}
    </>
  );
  if (to) {
    return (
      <Link to={to} aria-label={badge ? `${label} (${badge})` : label} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cls}>
      {content}
    </button>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
    setQuery("");
  };

  const links = [...NAV_LINKS, ...(user?.role === "seller" ? [{ to: "/seller", label: "Seller dashboard" }] : [])];

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-cream"
      >
        Skip to content
      </a>

      <div className="bg-ink text-cream">
        <p className="mx-auto max-w-360 px-4 py-2 text-center text-[11px] tracking-[0.12em] sm:px-6">
          <span className="sm:hidden">₹99 SHIPPING <span className="mx-1.5 text-stone">/</span> 7-DAY RETURNS</span>
          <span className="hidden sm:inline">
            STANDARD SHIPPING ₹99 <span className="mx-2 text-stone">/</span> 7-DAY RETURNS ON UNWORN PIECES
          </span>
        </p>
      </div>

      <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/85 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-360 grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:px-10">
          <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                className={() =>
                  `relative text-[13px] font-medium text-ink after:absolute after:-bottom-1.5 after:left-0 after:h-px after:bg-ink after:transition-all after:duration-300 after:ease-out ${
                    isLinkActive(link, location) ? "after:w-full" : "after:w-0 hover:after:w-full"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            className="relative -ml-2 flex h-10 w-10 items-center justify-center lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span
              className={`absolute h-[1.5px] w-5 bg-ink transition-transform duration-300 ease-[var(--ease-in-out)] ${
                menuOpen ? "rotate-45" : "-translate-y-[4px]"
              }`}
            />
            <span
              className={`absolute h-[1.5px] w-5 bg-ink transition-transform duration-300 ease-[var(--ease-in-out)] ${
                menuOpen ? "-rotate-45" : "translate-y-[4px]"
              }`}
            />
          </button>

          <Link to="/" className="font-display-wide justify-self-center text-[22px] font-extrabold text-ink" aria-label="HUSH home">
            HUSH
          </Link>

          <div className="flex items-center justify-end gap-0.5">
            <div className="hidden items-center sm:flex">
              <form
                onSubmit={submitSearch}
                className={`overflow-hidden transition-[width,opacity] duration-300 ease-out ${
                  searchOpen ? "w-52 opacity-100" : "w-0 opacity-0"
                }`}
                role="search"
              >
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onBlur={() => !query && setSearchOpen(false)}
                  placeholder="Search tees, denim, jackets"
                  aria-label="Search products"
                  tabIndex={searchOpen ? 0 : -1}
                  className="w-full border-b border-ink bg-transparent py-1 text-[13px] text-ink placeholder:text-stone focus:outline-none"
                />
              </form>
              <IconButton label="Search" onClick={() => setSearchOpen((v) => !v)}>
                <SearchIcon />
              </IconButton>
            </div>

            <IconButton to={user ? "/profile" : "/login"} label={user ? "Your account" : "Sign in"}>
              <UserIcon />
            </IconButton>

            <IconButton to="/cart" label="Bag" badge={count}>
              <BagIcon />
            </IconButton>

            {user?.role === "seller" && (
              <Link to="/seller" className="btn btn-outline ml-2 hidden px-3.5! py-2! text-xs xl:inline-flex">
                Seller dashboard
              </Link>
            )}
            {user && (
              <button
                type="button"
                onClick={logout}
                className="link-draw ml-3 hidden text-xs font-medium text-stone hover:text-ink md:block"
              >
                Log out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-30 bg-cream/95 backdrop-blur-2xl transition-opacity duration-300 lg:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!menuOpen}
      >
        <nav className="flex h-full flex-col justify-between px-6 pb-10 pt-32">
          <ul className="space-y-1">
            {links.map((link, i) => (
              <li key={link.label} className="overflow-hidden">
                <Link
                  to={link.to}
                  tabIndex={menuOpen ? 0 : -1}
                  className={`font-display block py-1 text-5xl font-black uppercase text-ink transition-transform duration-500 ease-out ${
                    menuOpen ? "translate-y-0" : "translate-y-full"
                  }`}
                  style={{ transitionDelay: menuOpen ? `${80 + i * 50}ms` : "0ms" }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <form onSubmit={submitSearch} role="search" className="flex items-center gap-3 border-b border-ink pb-2">
            <SearchIcon />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the store"
              aria-label="Search products"
              tabIndex={menuOpen ? 0 : -1}
              className="w-full bg-transparent text-base text-ink placeholder:text-stone focus:outline-none"
            />
          </form>
        </nav>
      </div>
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20.5c1.4-3.8 4.4-5.5 7.5-5.5s6.1 1.7 7.5 5.5" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M5.5 8.5h13l-1 12h-11l-1-12Z" />
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
    </svg>
  );
}
