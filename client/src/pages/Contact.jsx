import { useState } from "react";
import { Link } from "react-router-dom";

export default function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto max-w-360 px-4 pb-8 pt-10 sm:px-6 lg:px-10 lg:pt-14">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <h1 className="font-display text-7xl font-black uppercase leading-[0.82] text-ink sm:text-8xl">
            Say hello
          </h1>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-ink-soft">
            Questions about sizing, an order or a return? Send a note and we'll reply within one business day.
          </p>
          <p className="mt-6 text-sm text-stone">
            Looking for an order?{" "}
            <Link to="/profile?tab=orders" className="text-ink underline underline-offset-4">
              Track it from your account
            </Link>
            .
          </p>
        </div>

        <div className="lg:col-span-7">
          {sent ? (
            <div className="bg-paper p-8 lg:p-12" role="status">
              <p className="font-display text-4xl font-black uppercase text-ink">Message received</p>
              <p className="mt-3 text-sm text-stone">Thanks for writing. We'll get back to you within one business day.</p>
              <button type="button" onClick={() => setSent(false)} className="btn btn-outline mt-8">
                Send another
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="grid gap-5 bg-paper p-6 sm:grid-cols-2 lg:p-10"
            >
              <label className="block text-sm">
                <span className="mb-2 block text-xs font-medium text-ink">Name</span>
                <input required autoComplete="name" className="field bg-cream!" />
              </label>
              <label className="block text-sm">
                <span className="mb-2 block text-xs font-medium text-ink">Email</span>
                <input type="email" required autoComplete="email" className="field bg-cream!" />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-2 block text-xs font-medium text-ink">Order number (optional)</span>
                <input placeholder="e.g. 5C0C6F" className="field bg-cream!" />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-2 block text-xs font-medium text-ink">Message</span>
                <textarea required rows={6} className="field resize-y bg-cream!" />
              </label>
              <button type="submit" className="btn btn-primary sm:col-span-2 sm:justify-self-start">
                Send message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
