"use client";

import { use, useCallback, useEffect, useState } from "react";
import {
  CircleDollarSign,
  LayoutGrid,
  Lock,
  Mail,
  Phone,
  Receipt,
  ShieldCheck,
  Trophy,
  UserPlus,
  Wallet,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ROLES,
  PLAYER_TYPES,
  BATTING_HANDS,
  BOWLING_TYPES,
  PLAYER_TYPE_LABELS,
  BATTING_HAND_LABELS,
  BOWLING_TYPE_LABELS,
  EXPENSE_CATEGORY_LABELS,
} from "@cricket/shared";

const FIELD =
  "w-full h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13px] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10";
const LABEL = "block text-[12px] font-medium text-[var(--color-ink)] mb-1.5";

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ clubId: string; memberId: string }>;
}) {
  const { clubId, memberId } = use(params);
  const [roles, setRoles] = useState<string[]>([]);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("overview");

  const isAdmin = roles.includes("admin");
  const hasAccess = isAdmin || roles.includes("captain");

  const load = useCallback(async () => {
    try {
      const d = await apiFetch(`/clubs/${clubId}/members/${memberId}`);
      setData(d);
    } catch (err) {
      console.error(err);
      setData(null);
    }
  }, [clubId, memberId]);

  useEffect(() => {
    (async () => {
      try {
        const myClubs = await apiFetch("/clubs").catch(() => []);
        const entry = (myClubs || []).find((c: any) => c.club_id === clubId);
        setRoles(entry?.roles || []);
        setAccessLoaded(true);
        if (entry?.roles?.includes("admin") || entry?.roles?.includes("captain")) {
          await load();
        }
      } catch (err) {
        console.error(err);
        setAccessLoaded(true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  if (loading || !accessLoaded) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-48 rounded bg-[var(--color-bg-soft)] animate-pulse" />
        <div className="h-40 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] animate-pulse" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-lg mx-auto">
        <BackButton href={`/club/${clubId}/members`} label="Back to members" />
        <div className="mt-10 border border-dashed border-[var(--color-rule-strong)] rounded-xl bg-[var(--color-bg-sunken)] p-14 flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-rule)] flex items-center justify-center mb-4 shadow-[var(--shadow-soft)]">
            <Lock size={18} strokeWidth={1.6} className="text-[var(--color-ink-soft)]" />
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)] mb-1">You don&apos;t have access</h3>
          <p className="text-[13px] text-[var(--color-ink-soft)] max-w-xs">
            Only club admins and captains can view member details.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-lg mx-auto">
        <BackButton href={`/club/${clubId}/members`} label="Back to members" />
        <p className="mt-10 text-center text-[13px] text-[var(--color-ink-soft)]">Member not found.</p>
      </div>
    );
  }

  const profile = data.profile || {};
  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email || "Unnamed member";

  return (
    <div className="space-y-8 max-w-4xl">
      <header className="space-y-4">
        <BackButton href={`/club/${clubId}/members`} label="Back to members" />
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[var(--color-bg-soft)] ring-1 ring-[var(--color-rule)] flex items-center justify-center overflow-hidden shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[16px] font-semibold text-[var(--color-ink-soft)]">
                {(profile.first_name?.[0] || profile.email?.[0] || "?").toUpperCase()}
                {(profile.last_name?.[0] || "").toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-[26px] font-semibold text-[var(--color-ink)]">{fullName}</h1>
              {profile.is_placeholder && (
                <span className="inline-flex items-center gap-1 px-2 h-5 rounded text-[10px] font-medium uppercase tracking-wide bg-[var(--color-bg-soft)] text-[var(--color-ink-muted)] border border-[var(--color-rule)]">
                  <UserPlus size={10} strokeWidth={2} />
                  Off-app
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[12.5px] text-[var(--color-ink-soft)]">
              {profile.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail size={12} strokeWidth={1.8} />
                  {profile.email}
                </span>
              )}
              {profile.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone size={12} strokeWidth={1.8} />
                  {profile.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <TabBar active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="space-y-8">
          {/* Summary stats. Balance = payments made − expenses charged. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat
              icon={<Wallet size={15} />}
              label="Balance"
              value={formatCurrency(data.balance_cents)}
              tone={data.balance_cents < 0 ? "danger" : data.balance_cents > 0 ? "accent" : "default"}
              hint={data.balance_cents < 0 ? "Owes the club" : data.balance_cents > 0 ? "In credit" : "Settled"}
            />
            <Stat icon={<Receipt size={15} />} label="Charged" value={formatCurrency(data.expenses_charged_cents)} hint="Expenses assigned" />
            <Stat icon={<CircleDollarSign size={15} />} label="Paid" value={formatCurrency(data.paid_cents)} hint="Payments made" />
            <Stat icon={<Trophy size={15} />} label="Teams" value={String(data.teams?.length || 0)} />
          </div>

          <TeamsSection clubId={clubId} data={data} />
        </div>
      )}

      {tab === "profile" && (
        <ProfileSection clubId={clubId} memberId={memberId} data={data} isAdmin={isAdmin} onSaved={load} />
      )}

      {tab === "payments" && (
        <PaymentsSection clubId={clubId} data={data} isAdmin={isAdmin} onChanged={load} />
      )}

      {tab === "expenses" && <ExpensesSection data={data} />}
    </div>
  );
}

type TabId = "overview" | "profile" | "payments" | "expenses";

const MEMBER_TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "profile", label: "Profile & details", icon: ShieldCheck },
  { id: "payments", label: "Payments", icon: Wallet },
  { id: "expenses", label: "Expenses", icon: Receipt },
];

function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <div className="border-b border-[var(--color-rule)]">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {MEMBER_TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 px-3.5 h-10 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-[var(--color-accent)] text-[var(--color-ink)]"
                  : "border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-strong)]"
              }`}
            >
              <Icon size={14} strokeWidth={1.9} />
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = "default",
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "danger" | "accent";
  hint?: string;
}) {
  const toneClass =
    tone === "danger"
      ? "text-[var(--color-danger)]"
      : tone === "accent"
        ? "text-[var(--color-accent-ink)]"
        : "text-[var(--color-ink)]";
  return (
    <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-3.5">
      <div className="flex items-center gap-1.5 text-[var(--color-ink-muted)]">
        {icon}
        <span className="text-[10.5px] font-medium uppercase tracking-[0.08em]">{label}</span>
      </div>
      <div className={`mt-1.5 text-[19px] font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[10.5px] text-[var(--color-ink-muted)]">{hint}</div>}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-5">
      {children}
    </section>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-muted)] ${className}`}>
      {children}
    </th>
  );
}

function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] overflow-hidden">
      <table className="w-full text-left">{children}</table>
    </div>
  );
}

function DetailSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={`${FIELD} disabled:opacity-60`}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ProfileSection({
  clubId,
  memberId,
  data,
  isAdmin,
  onSaved,
}: {
  clubId: string;
  memberId: string;
  data: any;
  isAdmin: boolean;
  onSaved: () => void | Promise<void>;
}) {
  const profile = data.profile || {};
  const memberRoles: string[] = data.roles || [];

  const [firstName, setFirstName] = useState(profile.first_name || "");
  const [lastName, setLastName] = useState(profile.last_name || "");
  const [email, setEmail] = useState(profile.email || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [paypalEmail, setPaypalEmail] = useState(profile.paypal_email || "");
  const [status, setStatus] = useState(data.status || "active");
  const [joinDate, setJoinDate] = useState(data.join_date || "");
  const [playerType, setPlayerType] = useState(data.player_type || "");
  const [battingHand, setBattingHand] = useState(data.batting_hand || "");
  const [bowlingType, setBowlingType] = useState(data.bowling_type || "");
  const [notes, setNotes] = useState(data.notes || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function toggleRole(role: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (memberRoles.includes(role)) {
        await apiFetch(`/clubs/${clubId}/members/${memberId}/roles/${role}`, { method: "DELETE" });
      } else {
        await apiFetch(`/clubs/${clubId}/members/${memberId}/roles`, {
          method: "POST",
          body: JSON.stringify({ role }),
        });
      }
      await onSaved();
    } catch (err: any) {
      setError(err?.message || "Failed to update role");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      // Profile fields (name, email, phone, paypal).
      await apiFetch(`/clubs/${clubId}/members/${memberId}/profile`, {
        method: "PUT",
        body: JSON.stringify({
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          email: email.trim(),
          phone: phone.trim(),
          paypal_email: paypalEmail.trim(),
        }),
      });
      // Membership fields (status, join date, cricket details, notes).
      await apiFetch(`/clubs/${clubId}/members/${memberId}`, {
        method: "PUT",
        body: JSON.stringify({
          status,
          join_date: joinDate || null,
          player_type: playerType || null,
          batting_hand: battingHand || null,
          bowling_type: bowlingType || null,
          notes: notes.trim() || null,
        }),
      });
      await onSaved();
      setSaved(true);
    } catch (err: any) {
      setError(err?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      {!isAdmin ? (
        <ReadOnlyProfile data={data} />
      ) : (
        <div className="space-y-5">
          {error && (
            <div className="border border-[#fecaca] bg-[var(--color-danger-soft)] text-[var(--color-danger)] rounded-md px-3 py-2 text-[12px]">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>First name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Last name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} placeholder="—" />
            </div>
            <div>
              <label className={LABEL}>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={FIELD} placeholder="—" />
            </div>
            <div>
              <label className={LABEL}>PayPal email</label>
              <input type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} className={FIELD} placeholder="—" />
            </div>
            <div>
              <label className={LABEL}>Join date</label>
              <input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} className={FIELD} />
            </div>
          </div>

          <div>
            <span className={LABEL}>Roles</span>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((r) => {
                const active = memberRoles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={busy}
                    onClick={() => toggleRole(r)}
                    aria-pressed={active}
                    className={`h-8 px-3.5 rounded-full text-[12.5px] font-medium capitalize border transition-colors disabled:opacity-60 ${
                      active
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-[var(--color-rule)]"
                        : "bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] border-[var(--color-rule)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-faint)]"
                    }`}
                  >
                    {active ? "✓ " : "+ "}
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={FIELD}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DetailSelect label="Player type" value={playerType} onChange={setPlayerType} options={PLAYER_TYPES.map((v) => ({ value: v, label: PLAYER_TYPE_LABELS[v] }))} />
            <DetailSelect label="Batting hand" value={battingHand} onChange={setBattingHand} options={BATTING_HANDS.map((v) => ({ value: v, label: BATTING_HAND_LABELS[v] }))} />
            <DetailSelect label="Bowling type" value={bowlingType} onChange={setBowlingType} options={BOWLING_TYPES.map((v) => ({ value: v, label: BOWLING_TYPE_LABELS[v] }))} />
          </div>

          <div>
            <label className={LABEL}>Notes <span className="text-[var(--color-ink-muted)] font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Internal notes about this member…"
              className="w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 py-2 text-[13px] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            {saved && <span className="text-[12px] text-[var(--color-accent-ink)]">Saved</span>}
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ReadOnlyProfile({ data }: { data: any }) {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <Field label="Status" value={data.status === "active" ? "Active" : "Inactive"} />
      <Field label="Joined" value={data.join_date ? formatDate(data.join_date) : "—"} />
      <Field label="Roles" value={(data.roles || []).join(", ") || "—"} />
      <Field label="Player type" value={data.player_type ? PLAYER_TYPE_LABELS[data.player_type as keyof typeof PLAYER_TYPE_LABELS] : "—"} />
      <Field label="Batting" value={data.batting_hand ? BATTING_HAND_LABELS[data.batting_hand as keyof typeof BATTING_HAND_LABELS] : "—"} />
      <Field label="Bowling" value={data.bowling_type ? BOWLING_TYPE_LABELS[data.bowling_type as keyof typeof BOWLING_TYPE_LABELS] : "—"} />
    </dl>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.1em] uppercase text-[var(--color-ink-muted)]">{label}</dt>
      <dd className="text-[13px] text-[var(--color-ink)] mt-0.5 capitalize">{value}</dd>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]",
    pending: "bg-[#fef3c7] text-[#92400e]",
    cancelled: "bg-[var(--color-bg-soft)] text-[var(--color-ink-muted)]",
  };
  return (
    <span className={`inline-flex items-center px-2 h-5 rounded-full text-[10.5px] font-medium capitalize border border-[var(--color-rule)] ${map[status] || map.pending}`}>
      {status}
    </span>
  );
}

function PaymentsSection({
  clubId,
  data,
  isAdmin,
  onChanged,
}: {
  clubId: string;
  data: any;
  isAdmin: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const payments: any[] = data.payments || [];
  const userId = data.user_id;
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setStatus(paymentId: string, status: string) {
    setBusyId(paymentId);
    try {
      await apiFetch(`/clubs/${clubId}/payments/${paymentId}/assignments/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      await onChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  }

  if (payments.length === 0) {
    return (
      <Card>
        <p className="text-[13px] text-[var(--color-ink-soft)]">No payments assigned to this member.</p>
      </Card>
    );
  }

  return (
    <TableCard>
      <thead>
        <tr className="border-b border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
          <Th>Payment</Th>
          <Th className="text-right">Amount</Th>
          <Th>Status</Th>
          {isAdmin && <Th className="w-px"> </Th>}
        </tr>
      </thead>
      <tbody>
        {payments.map((p) => (
          <tr key={p.assignment_id} className="border-b border-[var(--color-rule)] last:border-0">
            <td className="px-4 py-3">
              <div className="text-[13.5px] font-medium text-[var(--color-ink)]">{p.title}</div>
              <div className="text-[11.5px] text-[var(--color-ink-soft)]">
                {p.due_date ? `Due ${formatDate(p.due_date)}` : "No due date"}
                {p.paid_at ? ` · Paid ${formatDate(p.paid_at.slice(0, 10))}` : ""}
              </div>
            </td>
            <td className="px-4 py-3 text-right text-[13.5px] font-semibold tabular-nums text-[var(--color-ink)] whitespace-nowrap">
              {formatCurrency(p.amount_cents)}
            </td>
            <td className="px-4 py-3"><PaymentStatusBadge status={p.status} /></td>
            {isAdmin && (
              <td className="px-4 py-3 text-right whitespace-nowrap">
                {p.status !== "paid" ? (
                  <button
                    disabled={busyId === p.payment_id}
                    onClick={() => setStatus(p.payment_id, "paid")}
                    className="h-7 px-2.5 rounded-md border border-[var(--color-rule)] text-[11.5px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-accent-ink)] hover:border-[var(--color-accent)] disabled:opacity-60 transition-colors"
                  >
                    Mark paid
                  </button>
                ) : (
                  <button
                    disabled={busyId === p.payment_id}
                    onClick={() => setStatus(p.payment_id, "pending")}
                    className="h-7 px-2.5 rounded-md border border-[var(--color-rule)] text-[11.5px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-60 transition-colors"
                  >
                    Undo
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </TableCard>
  );
}

function ExpensesSection({ data }: { data: any }) {
  // Expense shares assigned to this member (the debit side of their balance).
  const expenses: any[] = data.expenses || [];

  if (expenses.length === 0) {
    return (
      <Card>
        <p className="text-[13px] text-[var(--color-ink-soft)]">No expenses assigned to this member.</p>
      </Card>
    );
  }

  return (
    <TableCard>
      <thead>
        <tr className="border-b border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
          <Th>Expense</Th>
          <Th className="hidden sm:table-cell">Date</Th>
          <Th className="text-right">Share</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((e) => (
          <tr key={e.assignment_id ?? e.expense_id} className="border-b border-[var(--color-rule)] last:border-0">
            <td className="px-4 py-3">
              <div className="text-[13.5px] font-medium text-[var(--color-ink)]">{e.description}</div>
              <div className="text-[11.5px] text-[var(--color-ink-soft)]">
                {EXPENSE_CATEGORY_LABELS[e.category as keyof typeof EXPENSE_CATEGORY_LABELS] || e.category}
                {e.team?.name ? ` · ${e.team.name}` : ""}
                {e.game?.opponent ? ` · vs ${e.game.opponent}` : ""}
                <span className="sm:hidden">{e.expense_date ? ` · ${formatDate(e.expense_date)}` : ""}</span>
              </div>
            </td>
            <td className="px-4 py-3 hidden sm:table-cell text-[12.5px] text-[var(--color-ink-soft)] whitespace-nowrap">
              {e.expense_date ? formatDate(e.expense_date) : "—"}
            </td>
            <td className="px-4 py-3 text-right text-[13.5px] font-semibold tabular-nums text-[var(--color-ink)] whitespace-nowrap">
              {formatCurrency(e.share_cents)}
            </td>
            <td className="px-4 py-3"><PaymentStatusBadge status={e.status} /></td>
          </tr>
        ))}
      </tbody>
    </TableCard>
  );
}

function TeamsSection({ clubId, data }: { clubId: string; data: any }) {
  const teams: any[] = data.teams || [];
  const selections: any[] = data.selections || [];
  return (
    <Card>
      <div className="space-y-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-ink-muted)] mb-2">Teams</div>
          {teams.length === 0 ? (
            <p className="text-[13px] text-[var(--color-ink-soft)]">Not on any team.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {teams.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)] text-[12.5px] text-[var(--color-ink)]">
                  {t.name}
                  {t.year?.year ? <span className="text-[var(--color-ink-muted)]">· {t.year.label || t.year.year}</span> : null}
                  {t.is_captain && <span className="text-[10px] font-medium uppercase text-[var(--color-accent-ink)]">Capt</span>}
                </span>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-ink-muted)] mb-2">Recent selections</div>
          {selections.length === 0 ? (
            <p className="text-[13px] text-[var(--color-ink-soft)]">Not selected for any games yet.</p>
          ) : (
            <div className="space-y-1.5">
              {selections.map((s) => (
                <div key={s.game_id} className="flex items-center justify-between gap-4 text-[13px]">
                  <span className="text-[var(--color-ink)]">
                    vs {s.opponent}
                    {s.team_name ? <span className="text-[var(--color-ink-muted)]"> · {s.team_name}</span> : null}
                  </span>
                  <span className="text-[12px] text-[var(--color-ink-soft)]">{s.game_date ? formatDate(s.game_date) : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
