"use client";

import { use, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Wallet } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";
import { Modal, ModalActions } from "@/components/Modal";
import { MemberPicker } from "@/components/MemberPicker";
import { formatCurrency, formatDate, dollarsToCents } from "@/lib/utils";

export default function PaymentsPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = use(params);

  const [roles, setRoles] = useState<string[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const isAdmin = roles.includes("admin");

  useEffect(() => {
    (async () => {
      const myClubs = await apiFetch("/clubs").catch(() => []);
      const entry = (myClubs || []).find((c: any) => c.club_id === clubId);
      setRoles(entry?.roles || []);
      setRolesLoaded(true);
    })();
  }, [clubId]);

  if (!rolesLoaded) {
    return (
      <div className="space-y-8">
        <div className="h-9 w-56 rounded bg-[var(--color-bg-soft)] animate-pulse" />
        <div className="h-32 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <BackButton href={`/club/${clubId}`} label="Club" />
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-[var(--color-accent)] mb-2">
            {isAdmin ? "Ledger" : "Your dues"}
          </p>
          <h1 className="font-display text-[28px] leading-[1.1] font-semibold text-[var(--color-ink)]">
            Payments
          </h1>
        </div>
      </header>

      {isAdmin ? <AdminView clubId={clubId} /> : <MemberView clubId={clubId} />}
    </div>
  );
}

/* ---------------- Admin view ---------------- */

function AdminView({ clubId }: { clubId: string }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  // "all" | "general" (no season) | a year id
  const [seasonFilter, setSeasonFilter] = useState<string>("all");

  async function loadPayments() {
    let path = `/clubs/${clubId}/payments`;
    if (seasonFilter === "general") path += "?no_year=true";
    else if (seasonFilter !== "all") path += `?year_id=${seasonFilter}`;
    const data = await apiFetch(path);
    setPayments(data || []);
  }

  // Load seasons once; default the view to the active season.
  useEffect(() => {
    apiFetch(`/clubs/${clubId}/years`)
      .then((d) => {
        const list = d || [];
        setYears(list);
        const active = list.find((y: any) => y.is_active);
        if (active) setSeasonFilter(active.id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  // Reload the ledger whenever the season filter changes.
  useEffect(() => {
    setLoading(true);
    loadPayments()
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, seasonFilter]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this payment and all its assignments?")) return;
    try {
      await apiFetch(`/clubs/${clubId}/payments/${id}`, { method: "DELETE" });
      await loadPayments();
    } catch (err) {
      console.error(err);
    }
  }

  const collected = payments.reduce((s, p) => s + (p.collected_cents || 0), 0);
  const outstanding = payments.reduce((s, p) => s + (p.outstanding_cents || 0), 0);
  const billed = collected + outstanding;

  return (
    <>
      {/* Overview */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryStat label="Billed" value={formatCurrency(billed)} />
        <SummaryStat label="Collected" value={formatCurrency(collected)} tone="accent" />
        <SummaryStat label="Outstanding" value={formatCurrency(outstanding)} tone={outstanding > 0 ? "warn" : "default"} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <label htmlFor="pay-season-filter" className="text-[12px] font-medium text-[var(--color-ink-soft)]">
            Season
          </label>
          <select
            id="pay-season-filter"
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            className="h-9 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13px] font-medium text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
          >
            <option value="all">All seasons</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label || y.year}
              </option>
            ))}
            <option value="general">General (no season)</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-[13px] font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-rich)] shadow-[var(--shadow-soft)] transition-colors"
        >
          <Plus size={14} strokeWidth={2.25} />
          Create payment
        </button>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} eyebrow="New payment" title="Create payment">
        <CreatePaymentForm
          clubId={clubId}
          years={years}
          onClose={() => setShowForm(false)}
          onCreated={async () => {
            setShowForm(false);
            await loadPayments();
          }}
        />
      </Modal>

      {loading ? (
        <p className="text-[13px] text-[var(--color-ink-soft)]">Loading…</p>
      ) : payments.length === 0 ? (
        <EmptyState title="No payments yet" hint="Create a payment to assign dues to members." />
      ) : (
        <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
                <Th>Payment</Th>
                <Th className="text-right">Amount</Th>
                <Th className="hidden md:table-cell">Due</Th>
                <Th className="hidden sm:table-cell text-center">Paid</Th>
                <Th className="text-right hidden lg:table-cell">Outstanding</Th>
                <Th className="w-10"> </Th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <PaymentRow
                  key={p.id}
                  clubId={clubId}
                  payment={p}
                  onDelete={() => handleDelete(p.id)}
                  onChanged={loadPayments}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function CreatePaymentForm({
  clubId,
  years,
  onClose,
  onCreated,
}: {
  clubId: string;
  years: any[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    due_date: "",
  });
  // Default new dues to the active season when there is one.
  const [yearId, setYearId] = useState<string>(() => years.find((y) => y.is_active)?.id ?? "");
  const [assignAll, setAssignAll] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: any = {
        title: form.title,
        description: form.description || null,
        amount_cents: dollarsToCents(form.amount),
        due_date: form.due_date || null,
        year_id: yearId || null,
      };
      if (assignAll) {
        body.assign_all = true;
      } else {
        body.user_ids = Array.from(selected);
      }
      await apiFetch(`/clubs/${clubId}/payments`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      await onCreated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Title">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          placeholder="2026 season subscription"
          className={inputCls}
        />
      </Field>
      <Field label="Description" optional>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Covers ground hire and kit"
          className={inputCls}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount ($)">
          <input
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
            placeholder="150.00"
            className={inputCls}
          />
        </Field>
        <Field label="Due date" optional>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Season" optional>
        <select value={yearId} onChange={(e) => setYearId(e.target.value)} className={inputCls}>
          <option value="">No season (general)</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label || y.year}
              {y.is_active ? " · active" : ""}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <label className="block text-[12px] font-medium text-[var(--color-ink)] mb-1.5">
          Assign to
        </label>
        <div className="inline-flex rounded-md border border-[var(--color-rule-strong)] p-0.5 bg-[var(--color-bg-card)]">
          {(
            [
              { key: true, label: "Everyone" },
              { key: false, label: "Select members" },
            ] as const
          ).map((opt) => (
            <button
              key={String(opt.key)}
              type="button"
              onClick={() => setAssignAll(opt.key)}
              className={`h-8 px-3.5 rounded text-[12.5px] font-medium transition-colors ${
                assignAll === opt.key
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"
                  : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {!assignAll && <MemberPicker clubId={clubId} selected={selected} onToggle={toggleMember} />}

      <ModalActions>
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-3 rounded-md text-[13px] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || (!assignAll && selected.size === 0)}
          className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
        >
          {saving ? "Creating…" : "Create payment"}
        </button>
      </ModalActions>
    </form>
  );
}

function PaymentRow({
  clubId,
  payment,
  onDelete,
  onChanged,
}: {
  clubId: string;
  payment: any;
  onDelete: () => void;
  onChanged: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Individual payment: exactly one assignee, shown/managed inline (no expand).
  const solo = payment.assigned_count === 1 ? payment.sole_assignment : null;

  async function loadDetail() {
    setLoading(true);
    try {
      const data = await apiFetch(`/clubs/${clubId}/payments/${payment.id}`);
      setDetail(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    if (solo) return;
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) loadDetail();
  }

  async function setStatus(userId: string, status: string) {
    setBusy(true);
    try {
      await apiFetch(`/clubs/${clubId}/payments/${payment.id}/assignments/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (expanded) await loadDetail();
      await onChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  const assignments: any[] = detail?.assignments || [];

  return (
    <>
      <tr
        onClick={solo ? undefined : toggle}
        className={`border-b border-[var(--color-rule)] last:border-0 transition-colors group ${
          solo ? "" : "hover:bg-[var(--color-bg-soft)] cursor-pointer"
        }`}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {!solo && (
              <span className="text-[var(--color-ink-muted)] shrink-0">
                {expanded ? <ChevronUp size={15} strokeWidth={2} /> : <ChevronDown size={15} strokeWidth={2} />}
              </span>
            )}
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium text-[var(--color-ink)] truncate group-hover:text-[var(--color-accent-ink)]">
                {payment.title}
              </div>
              {solo ? (
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  <span className="text-[11.5px] text-[var(--color-ink-muted)] truncate">{memberName(solo)}</span>
                  <StatusBadge status={solo.status} />
                </div>
              ) : (
                payment.description && (
                  <div className="text-[11.5px] text-[var(--color-ink-muted)] truncate">{payment.description}</div>
                )
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-[var(--color-ink)]">
          {formatCurrency(payment.amount_cents)}
        </td>
        <td className="px-4 py-3 hidden md:table-cell text-[12.5px] text-[var(--color-ink-soft)]">
          {payment.due_date ? formatDate(payment.due_date) : "—"}
        </td>
        <td className="px-4 py-3 hidden sm:table-cell text-center text-[12.5px] tabular-nums text-[var(--color-ink-soft)]">
          {solo ? (solo.status === "paid" ? "Paid" : "Unpaid") : `${payment.paid_count}/${payment.assigned_count}`}
        </td>
        <td className="px-4 py-3 text-right hidden lg:table-cell text-[12.5px] tabular-nums">
          {payment.outstanding_cents > 0 ? (
            <span className="font-medium text-[var(--color-ink)]">{formatCurrency(payment.outstanding_cents)}</span>
          ) : (
            <span className="text-[var(--color-accent-ink)]">Settled</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {solo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setStatus(solo.user_id, solo.status === "paid" ? "pending" : "paid");
                }}
                disabled={busy}
                className={`h-7 px-2.5 rounded-md text-[12px] font-medium whitespace-nowrap disabled:opacity-60 ${
                  solo.status === "paid"
                    ? "text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
                    : "text-[var(--color-accent-ink)] bg-[var(--color-accent-soft)] hover:opacity-90"
                }`}
              >
                {solo.status === "paid" ? "Mark unpaid" : "Mark paid"}
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Delete payment"
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-colors shrink-0"
            >
              <Trash2 size={15} strokeWidth={1.9} />
            </button>
          </div>
        </td>
      </tr>

      {!solo && expanded && (
        <tr className="bg-[var(--color-bg-sunken)]">
          <td colSpan={6} className="px-4 py-4 border-b border-[var(--color-rule)]">
            {loading ? (
              <p className="text-[12.5px] text-[var(--color-ink-soft)]">Loading…</p>
            ) : assignments.length === 0 ? (
              <p className="text-[12.5px] text-[var(--color-ink-soft)]">No assignments.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {assignments.map((a) => (
                  <li
                    key={a.id ?? a.user_id}
                    className="flex items-center gap-3 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] px-3 py-2"
                  >
                    <span className="flex-1 min-w-0 text-[13.5px] text-[var(--color-ink)] truncate">
                      {memberName(a)}
                    </span>
                    <StatusBadge status={a.status} />
                    <div className="flex items-center gap-1 shrink-0">
                      {a.status !== "paid" && (
                        <button
                          type="button"
                          onClick={() => setStatus(a.user_id, "paid")}
                          className="h-7 px-2.5 rounded-md text-[12px] font-medium text-[var(--color-accent-ink)] bg-[var(--color-accent-soft)] hover:opacity-90"
                        >
                          Mark paid
                        </button>
                      )}
                      {a.status !== "pending" && (
                        <button
                          type="button"
                          onClick={() => setStatus(a.user_id, "pending")}
                          className="h-7 px-2.5 rounded-md text-[12px] font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
                        >
                          Mark pending
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

/* ---------------- Member view ---------------- */

function MemberView({ clubId }: { clubId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await apiFetch(`/clubs/${clubId}/my-payments`);
    setItems(data || []);
  }

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  if (loading) {
    return <p className="text-[13px] text-[var(--color-ink-soft)]">Loading…</p>;
  }

  if (items.length === 0) {
    return <EmptyState title="No payments" hint="You have no dues assigned right now." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((it) => (
        <MyPaymentRow key={it.id} clubId={clubId} item={it} onChange={load} />
      ))}
    </ul>
  );
}

function MyPaymentRow({
  clubId,
  item,
  onChange,
}: {
  clubId: string;
  item: any;
  onChange: () => Promise<void>;
}) {
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const p = item.payment || {};

  async function pay() {
    setPaying(true);
    setMessage("");
    try {
      const res = await apiFetch(`/clubs/${clubId}/payments/${p.id}/pay`, {
        method: "POST",
      });
      setMessage(res?.message || "Payment initiated.");
      await onChange();
    } catch (err: any) {
      setMessage(err.message || "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <li className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-[var(--color-ink)] truncate">
              {p.title}
            </span>
            <span className="text-[14px] font-semibold tabular-nums text-[var(--color-ink)]">
              {formatCurrency(p.amount_cents)}
            </span>
          </div>
          {p.description && (
            <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-soft)]">{p.description}</p>
          )}
          {p.due_date && (
            <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
              Due {formatDate(p.due_date)}
            </p>
          )}
        </div>
        <StatusBadge status={item.status} />
      </div>

      {item.status !== "paid" && item.status !== "cancelled" && (
        <div className="mt-3">
          <button
            type="button"
            onClick={pay}
            disabled={paying}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[12.5px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
          >
            <Wallet size={14} strokeWidth={2} />
            {paying ? "Processing…" : "Pay with PayPal"}
          </button>
        </div>
      )}

      {message && (
        <p className="mt-2 text-[12px] text-[var(--color-ink-soft)]">{message}</p>
      )}
    </li>
  );
}

/* ---------------- Shared bits ---------------- */

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-muted)] ${className}`}>
      {children}
    </th>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]",
    pending: "bg-[var(--color-warn-soft)] text-[var(--color-warn)]",
    cancelled: "bg-[var(--color-bg-soft)] text-[var(--color-ink-muted)] border border-[var(--color-rule)]",
  };
  const cls = map[status] || "bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)]";
  return (
    <span
      className={`inline-flex items-center px-2 h-5 rounded-full text-[10.5px] font-medium capitalize shrink-0 ${cls}`}
    >
      {status}
    </span>
  );
}

function SummaryStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "warn";
}) {
  const valueColor =
    tone === "accent"
      ? "text-[var(--color-accent-ink)]"
      : tone === "warn"
        ? "text-[var(--color-warn)]"
        : "text-[var(--color-ink)]";
  return (
    <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-4">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-muted)]">{label}</p>
      <p className={`mt-1.5 font-display text-[22px] leading-none font-semibold tabular-nums ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-rule-strong)] bg-[var(--color-bg-sunken)] p-10 flex flex-col items-center text-center">
      <div className="h-10 w-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-rule)] flex items-center justify-center mb-3">
        <Wallet size={18} strokeWidth={1.6} className="text-[var(--color-ink-soft)]" />
      </div>
      <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{title}</h3>
      <p className="mt-1 text-[12.5px] text-[var(--color-ink-soft)]">{hint}</p>
    </div>
  );
}

const inputCls =
  "w-full h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13.5px] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10";

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[var(--color-ink)] mb-1.5">
        {label}{" "}
        {optional && <span className="text-[var(--color-ink-muted)] font-normal">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

function memberName(m: any): string {
  const p = m.profile || {};
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return name || p.full_name || p.name || p.email || "Unknown";
}
