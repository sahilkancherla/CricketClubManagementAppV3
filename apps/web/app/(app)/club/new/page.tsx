"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";

export default function NewClubPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const club = await apiFetch("/clubs", {
        method: "POST",
        body: JSON.stringify({
          name,
          contact_email: contactEmail.trim() ? contactEmail.trim() : null,
        }),
      });
      router.push(`/club/${club.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create club");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <BackButton href="/dashboard" label="Back to dashboard" />
      <h1 className="mt-4 font-display text-[28px] font-semibold text-[var(--color-ink)]">Create a club</h1>
      <p className="mt-2 text-[13.5px] text-[var(--color-ink-soft)]">You&apos;ll become the first admin. You can add seasons, teams, and members next.</p>

      {error && (
        <div className="mt-6 border border-[#fecaca] bg-[var(--color-danger-soft)] text-[var(--color-danger)] rounded-md px-3 py-2.5 text-[13px]">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div>
          <label className="block text-[12px] font-medium text-[var(--color-ink)] mb-1.5">Club name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Riverside Cricket Club" className="w-full h-11 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13.5px] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-[var(--color-ink)] mb-1.5">Contact email <span className="text-[var(--color-ink-muted)] font-normal">(optional)</span></label>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="club@example.com" className="w-full h-11 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13.5px] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10" />
        </div>
        <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 h-11 px-5 rounded-md bg-[var(--color-accent)] text-white text-[13.5px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors shadow-[var(--shadow-soft)]">
          <Plus size={15} strokeWidth={2.25} />
          {loading ? "Creating…" : "Create club"}
        </button>
      </form>
    </div>
  );
}
