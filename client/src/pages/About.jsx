import { Link } from "react-router-dom";
import { LOOKS, pexels, srcSet } from "../data/lookbook";

export default function About() {
  return (
    <div className="mx-auto max-w-360 px-4 pb-8 pt-10 sm:px-6 lg:px-10 lg:pt-14">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <h1 className="font-display text-7xl font-black uppercase leading-[0.82] text-ink sm:text-8xl lg:text-9xl">
            Turn the volume down
          </h1>
          <div className="mt-10 max-w-lg space-y-5 text-[15px] leading-relaxed text-ink-soft">
            <p>
              HUSH makes the clothes you reach for without thinking: heavyweight tees, overshirts, denim, fleece and
              outerwear, mostly in black, bone and stone.
            </p>
            <p>
              No oversized logos, no seasonal gimmicks. Just considered fabrics and cuts that layer well, so a small
              wardrobe goes a long way.
            </p>
          </div>

          <dl className="mt-14 divide-y divide-line border-y border-ink">
            <div className="grid gap-2 py-6 sm:grid-cols-[160px_1fr]">
              <dt className="text-sm font-semibold text-ink">Shipping</dt>
              <dd className="text-sm leading-relaxed text-stone">
                Standard shipping is a flat ₹99 and typically arrives in 4–6 business days.
              </dd>
            </div>
            <div className="grid gap-2 py-6 sm:grid-cols-[160px_1fr]">
              <dt className="text-sm font-semibold text-ink">Returns</dt>
              <dd className="text-sm leading-relaxed text-stone">
                Unworn items can be returned within 7 days of delivery. Start a return by{" "}
                <Link to="/contact" className="text-ink underline underline-offset-4">
                  getting in touch
                </Link>
                .
              </dd>
            </div>
            <div className="grid gap-2 py-6 sm:grid-cols-[160px_1fr]">
              <dt className="text-sm font-semibold text-ink">Order tracking</dt>
              <dd className="text-sm leading-relaxed text-stone">
                Every order shows its status in{" "}
                <Link to="/profile?tab=orders" className="text-ink underline underline-offset-4">
                  your account
                </Link>
                , from placed to delivered.
              </dd>
            </div>
          </dl>
        </div>

        <div className="lg:col-span-6">
          <div className="grid grid-cols-5 gap-3 lg:sticky lg:top-24">
            <div className="col-span-3 aspect-3/4 overflow-hidden bg-cream-dark">
              <img
                src={pexels(LOOKS.greyShirt.id, 1000)}
                srcSet={srcSet(LOOKS.greyShirt.id)}
                sizes="(min-width: 1024px) 28vw, 60vw"
                alt={LOOKS.greyShirt.alt}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="col-span-2 mt-24 aspect-3/4 overflow-hidden bg-cream-dark">
              <img
                src={pexels(LOOKS.leatherJacket.id, 800)}
                srcSet={srcSet(LOOKS.leatherJacket.id)}
                sizes="(min-width: 1024px) 18vw, 40vw"
                alt={LOOKS.leatherJacket.alt}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
