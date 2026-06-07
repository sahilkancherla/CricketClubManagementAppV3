"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";
import {
  PLAYER_TYPES,
  BATTING_HANDS,
  BOWLING_TYPES,
  PLAYER_TYPE_LABELS,
  BATTING_HAND_LABELS,
  BOWLING_TYPE_LABELS,
} from "@cricket/shared";

export default function JoinClubPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const [club, setClub] = useState<any>(null);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [playerType, setPlayerType] = useState<string>("");
  const [battingHand, setBattingHand] = useState<string>("");
  const [bowlingType, setBowlingType] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, r] = await Promise.all([
        apiFetch(`/clubs/${clubId}`).catch(() => null),
        apiFetch(`/clubs/${clubId}/join-request`).catch(() => null),
      ]);
      setClub(c);
      setRequestStatus(r?.status ?? null);
    })();
  }, [clubId]);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch(`/clubs/${clubId}/join`, {
        method: "POST",
        body: JSON.stringify({
          player_type: playerType || null,
          batting_hand: battingHand || null,
          bowling_type: bowlingType || null,
        }),
      });
      setRequestStatus("pending");
    } catch (err: any) {
      setError(err.message || "Failed to send request");
    } finally {
      setLoading(false);
    }
  }

  const clubName = club?.name ?? "club";

  return (
    <div className="max-w-lg mx-auto">
      <BackButton href="/dashboard" label="Back to dashboard" />
      <h1 className="mt-4 font-display text-[28px] font-semibold text-[var(--color-ink)]">Join {clubName}</h1>

      {requestStatus === "pending" ? (
        <div className="mt-7 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-6 flex flex-col items-center text-center">
          <div className="h-11 w-11 rounded-full bg-[var(--color-warn-soft)] flex items-center justify-center mb-3">
            <Clock size={20} strokeWidth={1.8} className="text-[var(--color-warn)]" />
          </div>
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Request pending</h2>
          <p className="mt-1 text-[13px] text-[var(--color-ink-soft)] max-w-xs">
            Your request to join {clubName} is awaiting approval from a club admin. You&apos;ll see the
            club once you&apos;re approved.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex items-center h-9 px-4 rounded-md border border-[var(--color-rule-strong)] text-[13px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] no-underline transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      ) : requestStatus === "approved" ? (
        <div className="mt-7 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-6 flex flex-col items-center text-center">
          <div className="h-11 w-11 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center mb-3">
            <CheckCircle2 size={20} strokeWidth={1.8} className="text-[var(--color-accent)]" />
          </div>
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">You&apos;re in</h2>
          <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">Your request was approved.</p>
          <Link
            href={`/club/${clubId}`}
            className="mt-5 inline-flex items-center h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] no-underline transition-colors"
          >
            Go to club
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-[13.5px] text-[var(--color-ink-soft)]">
            Send a request to join. An admin will review it. Tell the club about your game — you can
            change these later.
          </p>

          {requestStatus === "rejected" && (
            <div className="mt-5 border border-[var(--color-rule)] bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)] rounded-md px-3 py-2.5 text-[12.5px]">
              A previous request was declined. You can send a new one.
            </div>
          )}

          {error && (
            <div className="mt-6 border border-[#fecaca] bg-[var(--color-danger-soft)] text-[var(--color-danger)] rounded-md px-3 py-2.5 text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleRequest} className="mt-7 space-y-4">
            <Select label="Player type" value={playerType} onChange={setPlayerType} options={PLAYER_TYPES.map((v) => ({ value: v, label: PLAYER_TYPE_LABELS[v] }))} />
            <Select label="Batting hand" value={battingHand} onChange={setBattingHand} options={BATTING_HANDS.map((v) => ({ value: v, label: BATTING_HAND_LABELS[v] }))} />
            <Select label="Bowling type" value={bowlingType} onChange={setBowlingType} options={BOWLING_TYPES.map((v) => ({ value: v, label: BOWLING_TYPE_LABELS[v] }))} />
            <button type="submit" disabled={loading} className="h-11 px-5 rounded-md bg-[var(--color-accent)] text-white text-[13.5px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors shadow-[var(--shadow-soft)]">
              {loading ? "Sending…" : "Request to join"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[var(--color-ink)] mb-1.5">{label} <span className="text-[var(--color-ink-muted)] font-normal">(optional)</span></label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-11 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13.5px] focus:border-[var(--color-ink)] focus:outline-none">
        <option value="">—</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
