import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LOOKS } from "../data/lookbook";
import { AuthLayout, Field } from "./Login";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await register(form.name, form.email, form.password);
      navigate(location.state?.from || "/profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      look={LOOKS.hoodiePair}
      title="Join HUSH"
      subtitle="Save your bag, check out faster and follow every order from the studio to your door."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" state={location.state} className="font-medium text-ink underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Full name" autoComplete="name" value={form.name} onChange={set("name")} required minLength={3} maxLength={20} />
        <Field label="Email address" type="email" autoComplete="email" value={form.email} onChange={set("email")} required />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          required
          minLength={6}
          hint="At least 6 characters."
        />

        {error && (
          <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn btn-primary w-full py-4!">
          {submitting ? "Creating your account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
