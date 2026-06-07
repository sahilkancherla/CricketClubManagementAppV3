"use client";

import { use, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Lock, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";
import { Modal, ModalActions } from "@/components/Modal";
import { MemberPicker } from "@/components/MemberPicker";
import { formatCurrency, formatDate, dollarsToCents, todayIso } from "@/lib/utils";
import { EXPENSE_CATEGORY_LABELS } from "@cricket/shared";

export default function ClubExpensesPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = use(params);

  const [roles, setRoles] = useState<string[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [data, setData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // "all" (overall club) | "general" (no season) | a year id
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  // "all" | a team id — only applies when a specific season is selected
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [filterTeams, setFilterTeams] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const isAdmin = roles.includes("admin");

  const currentYear = years.find((y) => y.id === seasonFilter);
  const seasonLabel = currentYear ? currentYear.label || String(currentYear.year) : "";
  const seasonPicked = seasonFilter !== "all" && seasonFilter !== "general";

  async function loadExpenses() {
    const qs: string[] = [];
    if (seasonFilter === "general") qs.push("no_year=true");
    else if (seasonFilter !== "all") qs.push(`year_id=${seasonFilter}`);
    if (teamFilter !== "all") qs.push(`team_id=${teamFilter}`);
    const path = `/clubs/${clubId}/expenses${qs.length ? `?${qs.join("&")}` : ""}`;
    const result = await apiFetch(path);
    setData(result);
  }

  useEffect(() => {
    (async () => {
      const myClubs = await apiFetch("/clubs").catch(() => []);
      const entry = (myClubs || []).find((c: any) => c.club_id === clubId);
      setRoles(entry?.roles || []);
      setRolesLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  // Reference data for the create form (members to split / pick a payer, years
  // to scope a team expense). Loaded once for admins.
  useEffect(() => {
    if (!rolesLoaded || !isAdmin) return;
    (async () => {
      await Promise.all([
        apiFetch(`/clubs/${clubId}/members`)
          .then((d) => setMembers(Array.isArray(d) ? d : d?.members || []))
          .catch(() => {}),
        apiFetch(`/clubs/${clubId}/years`)
          .then((d) => {
            const list = d || [];
            setYears(list);
            // Default the view to the active season, when there is one.
            const active = list.find((y: any) => y.is_active);
            if (active) setSeasonFilter(active.id);
          })
          .catch(() => {}),
      ]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesLoaded, isAdmin, clubId]);

  // Teams for the selected season, to populate the team filter.
  useEffect(() => {
    if (!rolesLoaded || !isAdmin || !seasonPicked) {
      setFilterTeams([]);
      return;
    }
    apiFetch(`/clubs/${clubId}/teams?year_id=${seasonFilter}`)
      .then((d) => setFilterTeams(d || []))
      .catch(() => setFilterTeams([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesLoaded, isAdmin, clubId, seasonFilter]);

  useEffect(() => {
    if (!rolesLoaded || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadExpenses()
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesLoaded, isAdmin, seasonFilter, teamFilter]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    try {
      await apiFetch(`/clubs/${clubId}/expenses/${id}`, { method: "DELETE" });
      await loadExpenses();
    } catch (err) {
      console.error(err);
    }
  }

  if (rolesLoaded && !isAdmin) {
    return (
      <div className="max-w-lg mx-auto">
        <BackButton href={`/club/${clubId}`} label="Club" />
        <div className="mt-10 rounded-xl border border-dashed border-[var(--color-rule-strong)] bg-[var(--color-bg-sunken)] p-12 flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-rule)] flex items-center justify-center mb-3">
            <Lock size={18} strokeWidth={1.6} className="text-[var(--color-ink-soft)]" />
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">Admins only</h3>
          <p className="mt-1 text-[13px] text-[var(--color-ink-soft)] max-w-xs">
            You need an admin role to view the club expense ledger.
          </p>
        </div>
      </div>
    );
  }

  const expenses: any[] = data?.expenses || [];
  const total: number = data?.total_cents ?? 0;

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <BackButton href={`/club/${clubId}`} label="Club" />
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-[var(--color-accent)] mb-2">
              Ledger
            </p>
            <h1 className="font-display text-[28px] leading-[1.1] font-semibold text-[var(--color-ink)]">
              Expenses
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="self-start md:self-auto inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-[13px] font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-rich)] shadow-[var(--shadow-soft)] transition-colors"
          >
            <Plus size={14} strokeWidth={2.25} />
            Add expense
          </button>
        </div>
      </header>

      {/* Total card */}
      <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-6">
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[var(--color-ink-muted)]">
          {seasonFilter === "all"
            ? "Total · all expenses"
            : seasonFilter === "general"
              ? "Total · general (no season)"
              : `Total · ${seasonLabel}`}
        </p>
        <p className="mt-1.5 font-display text-[34px] leading-none font-semibold tabular-nums text-[var(--color-ink)]">
          {formatCurrency(total)}
        </p>
      </div>

      {/* Add expense modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        eyebrow="New expense"
        title="Add expense"
        description="Pick a season (or general), optionally a team, record who paid, and split it across members."
        size="lg"
      >
        <CreateExpenseForm
          clubId={clubId}
          members={members}
          years={years}
          defaultYearId={
            seasonFilter === "all"
              ? years.find((y) => y.is_active)?.id ?? ""
              : seasonFilter === "general"
                ? ""
                : seasonFilter
          }
          onClose={() => setShowForm(false)}
          onCreated={async () => {
            setShowForm(false);
            await loadExpenses();
          }}
        />
      </Modal>

      {/* Filters */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <label htmlFor="season-filter" className="text-[12px] font-medium text-[var(--color-ink-soft)]">
          Season
        </label>
        <select
          id="season-filter"
          value={seasonFilter}
          onChange={(e) => {
            setSeasonFilter(e.target.value);
            setTeamFilter("all");
          }}
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

        {seasonPicked && filterTeams.length > 0 && (
          <>
            <label htmlFor="team-filter" className="text-[12px] font-medium text-[var(--color-ink-soft)] ml-1">
              Team
            </label>
            <select
              id="team-filter"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="h-9 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13px] font-medium text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
            >
              <option value="all">All teams</option>
              {filterTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-[13px] text-[var(--color-ink-soft)]">Loading…</p>
      ) : expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-rule-strong)] bg-[var(--color-bg-sunken)] p-10 flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-rule)] flex items-center justify-center mb-3">
            <Receipt size={18} strokeWidth={1.6} className="text-[var(--color-ink-soft)]" />
          </div>
          <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">No expenses</h3>
          <p className="mt-1 text-[12.5px] text-[var(--color-ink-soft)]">
            {seasonFilter === "all"
              ? "Nothing recorded yet."
              : seasonFilter === "general"
                ? "No general (no-season) expenses yet."
                : `No expenses for ${seasonLabel} yet.`}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
                <Th>Expense</Th>
                <Th className="hidden sm:table-cell">Team / Club</Th>
                <Th className="hidden md:table-cell">Date</Th>
                <Th className="hidden lg:table-cell">Paid by</Th>
                <Th className="hidden sm:table-cell text-center">Split</Th>
                <Th className="text-right">Amount</Th>
                <Th className="w-10"> </Th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((ex) => (
                <ExpenseRow
                  key={ex.id}
                  clubId={clubId}
                  expense={ex}
                  members={members}
                  onDelete={() => handleDelete(ex.id)}
                  onChanged={loadExpenses}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- Create form ---------------- */

function CreateExpenseForm({
  clubId,
  members,
  years,
  defaultYearId,
  onClose,
  onCreated,
}: {
  clubId: string;
  members: any[];
  years: any[];
  defaultYearId: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    description: "",
    amount: "",
    expense_date: todayIso(),
  });
  const [yearId, setYearId] = useState(defaultYearId); // "" = general (no season)
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [gameId, setGameId] = useState("");
  const [games, setGames] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [paidBy, setPaidBy] = useState(""); // "" => server defaults to current admin
  const [assignAll, setAssignAll] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // The member pool to split across: a team's roster, else all club members.
  const pool = teamId
    ? roster.map((r) => ({ user_id: r.user_id, profile: r.profile }))
    : members;

  // Load teams for the chosen season.
  useEffect(() => {
    if (!yearId) {
      setTeams([]);
      setTeamId("");
      return;
    }
    apiFetch(`/clubs/${clubId}/teams?year_id=${yearId}`)
      .then((d) => setTeams(d || []))
      .catch(() => setTeams([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId, clubId]);

  // Load roster for the chosen team.
  useEffect(() => {
    if (!teamId) {
      setRoster([]);
      return;
    }
    apiFetch(`/clubs/${clubId}/teams/${teamId}`)
      .then((d) => setRoster(d?.members || []))
      .catch(() => setRoster([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, clubId]);

  // Load games for the chosen team (to optionally scope an expense to a game).
  useEffect(() => {
    if (!teamId) {
      setGames([]);
      setGameId("");
      return;
    }
    apiFetch(`/clubs/${clubId}/teams/${teamId}/games`)
      .then((d) => setGames(d || []))
      .catch(() => setGames([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, clubId]);

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
        description: form.description,
        amount_cents: dollarsToCents(form.amount),
        expense_date: form.expense_date || null,
      };
      if (yearId) body.year_id = yearId;
      if (teamId) body.team_id = teamId;
      if (gameId) body.game_id = gameId;
      if (paidBy) body.paid_by_user_id = paidBy;
      if (assignAll) body.assign_all = true;
      else body.user_ids = Array.from(selected);

      await apiFetch(`/clubs/${clubId}/expenses`, {
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

  const canSubmit = !saving && (assignAll || selected.size > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Description">
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
          placeholder="Ground booking — Saturday"
          className={inputCls}
        />
      </Field>
      <Field label="Amount ($)">
        <input
          inputMode="decimal"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
          placeholder="250.00"
          className={inputCls}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input
            type="date"
            value={form.expense_date}
            onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Paid by">
          <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={inputCls}>
            <option value="">Me (admin)</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {memberName(m)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Season + team scope */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Season">
          <select
            value={yearId}
            onChange={(e) => {
              setYearId(e.target.value);
              setTeamId("");
              setSelected(new Set());
            }}
            className={inputCls}
          >
            <option value="">General (no season)</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label || y.year}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Team (optional)">
          <select
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setGameId("");
              setSelected(new Set());
            }}
            className={inputCls}
            disabled={!yearId}
          >
            <option value="">{yearId ? "No specific team" : "Pick a season first"}</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {teamId && (
        <Field label="Game (optional)">
          <select
            value={gameId}
            onChange={(e) => {
              setGameId(e.target.value);
              setSelected(new Set());
            }}
            className={inputCls}
          >
            <option value="">No specific game</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                vs {g.opponent}
                {g.game_date ? ` · ${formatDate(g.game_date)}` : ""}
                {g.selection_count ? ` · ${g.selection_count} selected` : ""}
              </option>
            ))}
          </select>
        </Field>
      )}

      {/* Split */}
      <div>
        <label className="block text-[12px] font-medium text-[var(--color-ink)] mb-1.5">
          Split across
        </label>
        <div className="inline-flex rounded-md border border-[var(--color-rule-strong)] p-0.5 bg-[var(--color-bg-card)]">
          {(
            [
              { key: true, label: gameId ? "Players in game" : teamId ? "Whole team" : "Everyone" },
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
        <p className="mt-1.5 text-[11.5px] text-[var(--color-ink-muted)]">
          The amount is divided equally into per-member shares. The payer&apos;s own share is
          marked paid automatically.
        </p>
      </div>

      {!assignAll &&
        (teamId ? (
          <RosterCheckboxList pool={pool} selected={selected} onToggle={toggleMember} emptyHint="This team has no players yet." />
        ) : (
          <MemberPicker clubId={clubId} selected={selected} onToggle={toggleMember} />
        ))}

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
          disabled={!canSubmit}
          className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
        >
          {saving ? "Adding…" : "Add expense"}
        </button>
      </ModalActions>
    </form>
  );
}

/* ---------------- Expense row ---------------- */

function ExpenseRow({
  clubId,
  expense,
  members,
  onDelete,
  onChanged,
}: {
  clubId: string;
  expense: any;
  members: any[];
  onDelete: () => void;
  onChanged: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const hasSplit = (expense.assigned_count ?? 0) > 0;

  async function loadDetail() {
    setLoading(true);
    try {
      const data = await apiFetch(`/clubs/${clubId}/expenses/${expense.id}`);
      setDetail(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) loadDetail();
  }

  async function setStatus(userId: string, status: string) {
    try {
      await apiFetch(`/clubs/${clubId}/expenses/${expense.id}/assignments/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      await Promise.all([loadDetail(), onChanged()]);
    } catch (err) {
      console.error(err);
    }
  }

  const assignments: any[] = detail?.assignments || [];
  const payerName = expense.paid_by
    ? [expense.paid_by.first_name, expense.paid_by.last_name].filter(Boolean).join(" ").trim() ||
      expense.paid_by.email
    : null;

  return (
    <>
      <tr
        onClick={toggle}
        className="border-b border-[var(--color-rule)] last:border-0 hover:bg-[var(--color-bg-soft)] transition-colors cursor-pointer group align-top"
      >
        <td className="px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="text-[var(--color-ink-muted)] shrink-0 mt-0.5">
              {expanded ? <ChevronUp size={15} strokeWidth={2} /> : <ChevronDown size={15} strokeWidth={2} />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] font-medium text-[var(--color-ink)] group-hover:text-[var(--color-accent-ink)]">
                  {expense.description}
                </span>
                {expense.category && (
                  <span className="inline-flex items-center px-2 h-5 rounded-full text-[10.5px] font-medium bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]">
                    {EXPENSE_CATEGORY_LABELS[
                      expense.category as keyof typeof EXPENSE_CATEGORY_LABELS
                    ] ?? expense.category}
                  </span>
                )}
              </div>
              {/* Compact meta on small screens where dedicated columns are hidden */}
              <div className="sm:hidden text-[11.5px] text-[var(--color-ink-muted)] mt-0.5">
                {expense.team?.name ?? "Club"}
                {expense.expense_date ? ` · ${formatDate(expense.expense_date)}` : ""}
                {payerName ? ` · ${payerName}` : ""}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell text-[12.5px] text-[var(--color-ink-soft)] whitespace-nowrap">
          {expense.team?.name ?? "Club"}
        </td>
        <td className="px-4 py-3 hidden md:table-cell text-[12.5px] text-[var(--color-ink-soft)] whitespace-nowrap">
          {expense.expense_date ? formatDate(expense.expense_date) : "—"}
        </td>
        <td className="px-4 py-3 hidden lg:table-cell text-[12.5px] text-[var(--color-ink-soft)]">
          {payerName || "—"}
        </td>
        <td className="px-4 py-3 hidden sm:table-cell text-center text-[12.5px] tabular-nums text-[var(--color-ink-soft)]">
          {hasSplit ? `${expense.paid_count}/${expense.assigned_count}` : "—"}
        </td>
        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-[var(--color-ink)] whitespace-nowrap">
          {formatCurrency(expense.amount_cents)}
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete expense"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-colors"
          >
            <Trash2 size={15} strokeWidth={1.9} />
          </button>
          <Modal
            open={editing}
            onClose={() => setEditing(false)}
            eyebrow="Edit split"
            title={expense.description}
            description="Change who the cost is divided across and who paid. Members who stay keep their settled status."
            size="lg"
          >
            <EditSplitForm
              clubId={clubId}
              expense={expense}
              members={members}
              currentAssignments={assignments}
              onClose={() => setEditing(false)}
              onSaved={async () => {
                setEditing(false);
                await Promise.all([loadDetail(), onChanged()]);
              }}
            />
          </Modal>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-[var(--color-bg-sunken)]">
          <td colSpan={7} className="px-4 py-4 border-b border-[var(--color-rule)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium tracking-[0.06em] uppercase text-[var(--color-ink-soft)]">
                Split
              </span>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium border border-[var(--color-rule-strong)] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)] transition-colors"
              >
                <Pencil size={13} strokeWidth={2} />
                Edit split
              </button>
            </div>
            {loading ? (
              <p className="text-[12.5px] text-[var(--color-ink-soft)]">Loading…</p>
            ) : assignments.length === 0 ? (
              <p className="text-[12.5px] text-[var(--color-ink-soft)]">
                Not split across any members yet. Use “Edit split” to divide it.
              </p>
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
                    <span className="text-[13px] font-semibold tabular-nums text-[var(--color-ink)] shrink-0">
                      {formatCurrency(a.share_cents)}
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

/* ---------------- Edit split form ---------------- */

function EditSplitForm({
  clubId,
  expense,
  members,
  currentAssignments,
  onClose,
  onSaved,
}: {
  clubId: string;
  expense: any;
  members: any[];
  currentAssignments: any[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const teamId: string | null = expense.team?.id ?? expense.team_id ?? null;
  const [roster, setRoster] = useState<any[]>([]);
  const [assignAll, setAssignAll] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set((currentAssignments || []).map((a) => a.user_id)),
  );
  const [paidBy, setPaidBy] = useState<string>(expense.paid_by?.id ?? "");
  const [saving, setSaving] = useState(false);

  // Team-scoped expenses split across the roster; otherwise across club members.
  useEffect(() => {
    if (!teamId) {
      setRoster([]);
      return;
    }
    apiFetch(`/clubs/${clubId}/teams/${teamId}`)
      .then((d) => setRoster(d?.members || []))
      .catch(() => setRoster([]));
  }, [teamId, clubId]);

  const pool = teamId
    ? roster.map((r) => ({ user_id: r.user_id, profile: r.profile }))
    : members;

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
      const body: any = { paid_by_user_id: paidBy || null };
      if (assignAll) body.assign_all = true;
      else body.user_ids = Array.from(selected);

      await apiFetch(`/clubs/${clubId}/expenses/${expense.id}/split`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      await onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Paid by">
        <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={inputCls}>
          <option value="">— No payer —</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {memberName(m)}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <label className="block text-[12px] font-medium text-[var(--color-ink)] mb-1.5">
          Split across
        </label>
        <div className="inline-flex rounded-md border border-[var(--color-rule-strong)] p-0.5 bg-[var(--color-bg-card)]">
          {(
            [
              { key: true, label: teamId ? "Whole team" : "Everyone" },
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
        <p className="mt-1.5 text-[11.5px] text-[var(--color-ink-muted)]">
          {formatCurrency(expense.amount_cents)} is re-divided equally. Members already marked
          paid keep that status.
        </p>
      </div>

      {!assignAll &&
        (teamId ? (
          <RosterCheckboxList pool={pool} selected={selected} onToggle={toggleMember} emptyHint="This team has no players yet." />
        ) : (
          <MemberPicker clubId={clubId} selected={selected} onToggle={toggleMember} />
        ))}

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
          disabled={saving}
          className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving…" : "Save split"}
        </button>
      </ModalActions>
    </form>
  );
}

/* ---------------- Shared bits ---------------- */

// Small in-memory checkbox list for a fixed pool (e.g. a team roster). The
// club-wide picker uses the paginated <MemberPicker> instead.
function RosterCheckboxList({
  pool,
  selected,
  onToggle,
  emptyHint,
}: {
  pool: any[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  emptyHint: string;
}) {
  return (
    <div className="max-h-56 overflow-y-auto rounded-md border border-[var(--color-rule)] divide-y divide-[var(--color-rule)]">
      {pool.length === 0 ? (
        <p className="px-3 py-2.5 text-[12.5px] text-[var(--color-ink-muted)]">{emptyHint}</p>
      ) : (
        pool.map((m) => (
          <label
            key={m.user_id}
            className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-soft)]"
          >
            <input
              type="checkbox"
              checked={selected.has(m.user_id)}
              onChange={() => onToggle(m.user_id)}
              className="accent-[var(--color-accent)]"
            />
            <span className="text-[13.5px] text-[var(--color-ink)]">{memberName(m)}</span>
          </label>
        ))
      )}
    </div>
  );
}

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
    cancelled:
      "bg-[var(--color-bg-soft)] text-[var(--color-ink-muted)] border border-[var(--color-rule)]",
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

const inputCls =
  "w-full h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13.5px] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[var(--color-ink)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function memberName(m: any): string {
  const p = m.profile || {};
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return name || p.full_name || p.name || p.email || "Unknown";
}
