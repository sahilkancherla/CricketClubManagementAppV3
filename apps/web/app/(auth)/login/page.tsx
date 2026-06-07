"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { APP_NAME } from "@cricket/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-base)]">
      <div className="p-6 sm:p-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors no-underline">
          <ArrowLeft size={14} strokeWidth={1.8} />
          Back to {APP_NAME}
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-8">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-accent-rich)] to-[var(--color-accent-deep)] text-white text-[13px] font-semibold">
              {APP_NAME.charAt(0)}
            </span>
            <span className="text-[15px] font-semibold tracking-tight">{APP_NAME}</span>
          </div>

          <h2 className="font-display text-[28px] leading-tight font-semibold text-[var(--color-ink)]">Sign in to your club</h2>
          <p className="mt-2 text-[13.5px] text-[var(--color-ink-soft)]">Use the email associated with your account.</p>

          {error && (
            <div className="mt-6 border border-[#fecaca] bg-[var(--color-danger-soft)] text-[var(--color-danger)] rounded-md px-3 py-2.5 text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@club.com" value={email} onChange={setEmail} required />
            <Field id="password" label="Password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={setPassword} required />

            <button type="submit" disabled={loading} className="group w-full h-11 mt-2 inline-flex items-center justify-center gap-1.5 rounded-md bg-[var(--color-accent)] text-white text-[13.5px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors shadow-[var(--shadow-soft)]">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Signing in
                </span>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--color-rule)]">
            <p className="text-[13px] text-[var(--color-ink-soft)]">
              New to {APP_NAME}?{" "}
              <Link href="/register" className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent-ink)] no-underline">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id, label, type, placeholder, value, onChange, required, autoComplete,
}: {
  id: string; label: string; type: string; placeholder: string;
  value: string; onChange: (v: string) => void; required?: boolean; autoComplete?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="text-[12px] font-medium text-[var(--color-ink)]">{label}</label>
      </div>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full h-11 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13.5px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10 transition-colors"
      />
    </div>
  );
}
