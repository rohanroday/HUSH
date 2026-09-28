import { Link } from "react-router-dom";

const GROUPS = [
  {
    title: "Shop",
    links: [
      ["Everything", "/shop"],
      ["Jackets", "/shop?category=Jackets"],
      ["T-Shirts", "/shop?category=T-Shirts"],
      ["Hoodies", "/shop?category=Hoodies"],
      ["Jeans", "/shop?category=Jeans"],
    ],
  },
  {
    title: "Help",
    links: [
      ["Contact us", "/contact"],
      ["Shipping & returns", "/about"],
      ["Track an order", "/profile?tab=orders"],
    ],
  },
  {
    title: "Account",
    links: [
      ["Sign in", "/login"],
      ["Create account", "/register"],
      ["Your bag", "/cart"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-24 bg-ink text-cream">
      <div className="mx-auto grid max-w-360 gap-12 px-4 pb-10 pt-20 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-10">
        <div className="max-w-xs">
          <p className="text-lg font-medium leading-snug">
            Quiet clothes, cut well and made to be worn on repeat.
          </p>
          <Link to="/shop" className="link-draw mt-6 inline-block text-sm text-cream/80 hover:text-cream">
            Browse the full collection →
          </Link>
        </div>
        {GROUPS.map((group) => (
          <div key={group.title}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-cream/50">{group.title}</p>
            <ul className="mt-4 space-y-2.5">
              {group.links.map(([label, to]) => (
                <li key={label}>
                  <Link to={to} className="link-draw text-sm text-cream/85 hover:text-cream">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="overflow-hidden px-2" aria-hidden="true">
        <p className="font-display select-none text-center text-[31vw] font-black leading-[0.72] tracking-[-0.04em] text-cream/[0.07]">
          HUSH
        </p>
      </div>

      <div className="border-t border-cream/10">
        <div className="mx-auto flex max-w-360 flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-cream/50 sm:px-6 lg:px-10">
          <p>© {new Date().getFullYear()} HUSH. All rights reserved.</p>
          <p>Lookbook photography via Pexels.</p>
        </div>
      </div>
    </footer>
  );
}
