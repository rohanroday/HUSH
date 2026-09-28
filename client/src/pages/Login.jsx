import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LOOKS, pexels, srcSet } from "../data/lookbook";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const user = await login(form.email, form.password);
      navigate(location.state?.from || (user.role === "seller" ? "/seller" : "/profile"));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      look={LOOKS.studioSide}
      title="Welcome back"
      subtitle="Sign in to see your bag, your orders and where they are."
      footer={
        <>
          New to HUSH?{" "}
          <Link to="/register" state={location.state} className="font-medium text-ink underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate={false}>
        <Field
          label="Email address"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(v) => setForm((f) => ({ ...f, email: v }))}
          required
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={(v) => setForm((f) => ({ ...f, password: v }))}
          required
        />

        {error && (
          <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn btn-primary w-full py-4!">
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}

export function AuthLayout({ look, title, subtitle, children, footer }) {
  return (
    <div className="mx-auto grid max-w-360 lg:min-h-[calc(100dvh-6rem)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <img
          src={pexels(look.id, 1400)}
          srcSet={srcSet(look.id)}
          sizes="50vw"
          alt={look.alt}
          className="hero-mask absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-ink/60 to-transparent" />
        <p className="font-display-wide absolute bottom-10 left-10 text-3xl font-extrabold text-paper">HUSH</p>
      </div>

      <div className="flex flex-col justify-center px-4 py-16 sm:px-10 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-display text-6xl font-black uppercase leading-[0.85] text-ink">{title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-stone">{subtitle}</p>
          <div className="mt-10">{children}</div>
          <p className="mt-8 text-sm text-stone">{footer}</p>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, type = "text", value, onChange, required, hint, ...rest }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block text-xs font-medium text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="field"
        {...rest}
      />
      {hint && <span className="mt-1.5 block text-xs text-stone">{hint}</span>}
    </label>
  );
}
