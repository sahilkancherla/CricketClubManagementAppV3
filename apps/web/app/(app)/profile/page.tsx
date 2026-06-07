"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    apiFetch("/profiles/me")
      .then((p: any) => {
        setEmail(p?.email || "");
        setFirstName(p?.first_name || "");
        setLastName(p?.last_name || "");
        setPhone(p?.phone || "");
        setPaypalEmail(p?.paypal_email || "");
      })
      .catch((err: any) => setError(err?.message || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiFetch("/profiles/me", {
        method: "PUT",
        body: JSON.stringify({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
          paypal_email: paypalEmail.trim() || null,
        }),
      });
      setSuccess("Profile saved.");
    } catch (err: any) {
      setError(err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <BackButton href="/dashboard" label="Back to dashboard" />
      <h1 className="mt-4 font-display text-[28px] font-semibold text-[var(--color-ink)]">My profile</h1>
      <p className="mt-2 text-[13.5px] text-[var(--color-ink-soft)]">Manage your personal details and payout email.</p>

      {error && (
        <div className="mt-6 border border-[#fecaca] bg-[var(--color-danger-soft)] text-[var(--color-danger)] rounded-md px-3 py-2.5 text-[13px]">{error}</div>
      )}
      {success && (
        <div className="mt-6 border border-[var(--color-rule)] bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] rounded-md px-3 py-2.5 text-[13px]">{success}</div>
      )}

      {loading ? (
        <div className="mt-7 space-y-4 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-3 w-24 rounded bg-[var(--color-bg-soft)] mb-2" />
              <div className="h-11 w-full rounded-md bg-[var(--color-bg-soft)]" />
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[var(--color-ink)] mb-1.5">Account email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full h-11 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)] px-3 text-[13.5px] text-[var(--color-ink-muted)]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[var(--color-ink)] mb-1.5">First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Sachin"
                className="w-full h-11 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13.5px] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--color-ink)] mb-1.5">Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Tendulkar"
                className="w-full h-11 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13.5px] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--color-ink)] mb-1.5">Phone <span className="text-[var(--color-ink-muted)] font-normal">(optional)</span></label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              className="w-full h-11 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13.5px] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--color-ink)] mb-1.5">PayPal email <span className="text-[var(--color-ink-muted)] font-normal">— used for payouts</span></label>
            <input
              type="email"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              placeholder="you@paypal.com"
              className="w-full h-11 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13.5px] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="h-11 px-5 rounded-md bg-[var(--color-accent)] text-white text-[13.5px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors shadow-[var(--shadow-soft)]"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}
    </div>
  );
}
