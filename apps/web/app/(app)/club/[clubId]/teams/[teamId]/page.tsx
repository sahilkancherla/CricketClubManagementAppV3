"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Crown,
  MapPin,
  Plus,
  Receipt,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";
import { Modal, ModalActions } from "@/components/Modal";
import { formatCurrency, formatDate, formatTime, dollarsToCents, todayIso } from "@/lib/utils";
import { EXPENSE_CATEGORY_LABELS } from "@cricket/shared";

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ clubId: string; teamId: string }>;
}) {
  const { clubId, teamId } = use(params);

  const [team, setTeam] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [clubMembers, setClubMembers] = useState<any[]>([]);
  const [expenseData, setExpenseData] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TeamTab>("roster");

  const isAdmin = roles.includes("admin");

  async function loadTeam() {
    const data = await apiFetch(`/clubs/${clubId}/teams/${teamId}`);
    setTeam(data);
  }

  async function loadGames() {
    const data = await apiFetch(`/clubs/${clubId}/teams/${teamId}/games`);
    setGames(data || []);
  }

  async function loadMembers() {
    try {
      // /members returns a paginated object ({ members, total, ... }); older
      // builds returned a plain array. Tolerate both so .filter never throws.
      const data = await apiFetch(`/clubs/${clubId}/members`);
      setClubMembers(Array.isArray(data) ? data : data?.members || []);
    } catch {
      /* not admin/captain — ignore */
    }
  }

  async function loadExpenses() {
    try {
      const data = await apiFetch(`/clubs/${clubId}/expenses?team_id=${teamId}`);
      setExpenseData(data);
    } catch {
      /* not admin — ignore */
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const myClubs = await apiFetch("/clubs").catch(() => []);
        const entry = (myClubs || []).find((c: any) => c.club_id === clubId);
        const r: string[] = entry?.roles || [];
        setRoles(r);
        await Promise.all([
          loadTeam(),
          loadGames(),
          r.includes("admin") ? loadMembers() : Promise.resolve(),
          r.includes("admin") ? loadExpenses() : Promise.resolve(),
        ]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, teamId]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-9 w-64 rounded bg-[var(--color-bg-soft)] animate-pulse" />
        <div className="h-40 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] animate-pulse" />
      </div>
    );
  }

  if (!team) {
    return <p className="text-[13px] text-[var(--color-ink-soft)]">Team not found.</p>;
  }

  const members: any[] = team.members || [];
  const memberUserIds = new Set(members.map((m) => m.user_id));
  const availableMembers = clubMembers.filter((m) => !memberUserIds.has(m.user_id));

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <BackButton href={`/club/${clubId}/teams`} label="Teams" />
        <div>
          <h1 className="font-display text-[28px] leading-[1.1] font-semibold text-[var(--color-ink)]">
            {team.name}
          </h1>
          {team.year && (
            <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">
              {team.year.label || team.year.year}
            </p>
          )}
          {team.description && (
            <p className="mt-2 text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed max-w-2xl">
              {team.description}
            </p>
          )}
        </div>
      </header>

      <TeamTabBar active={tab} onChange={setTab} isAdmin={isAdmin} />

      {tab === "roster" && (
        <RosterSection
          clubId={clubId}
          teamId={teamId}
          members={members}
          availableMembers={availableMembers}
          clubMembers={clubMembers}
          isAdmin={isAdmin}
          onChange={loadTeam}
        />
      )}

      {tab === "games" && (
        <GamesSection
          clubId={clubId}
          teamId={teamId}
          games={games}
          isAdmin={isAdmin}
          onChange={loadGames}
        />
      )}

      {tab === "expenses" && isAdmin && (
        <ExpensesSection
          clubId={clubId}
          teamId={teamId}
          games={games}
          data={expenseData}
          onChange={loadExpenses}
        />
      )}
    </div>
  );
}

type TeamTab = "roster" | "games" | "expenses";

function TeamTabBar({
  active,
  onChange,
  isAdmin,
}: {
  active: TeamTab;
  onChange: (t: TeamTab) => void;
  isAdmin: boolean;
}) {
  const tabs: { id: TeamTab; label: string; icon: typeof Users }[] = [
    { id: "roster", label: "Roster", icon: Users },
    { id: "games", label: "Games", icon: CalendarDays },
    ...(isAdmin
      ? [{ id: "expenses" as const, label: "Team expenses", icon: Receipt }]
      : []),
  ];
  return (
    <div className="border-b border-[var(--color-rule)]">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
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

/* ---------------- Roster ---------------- */

function RosterSection({
  clubId,
  teamId,
  members,
  availableMembers,
  clubMembers,
  isAdmin,
  onChange,
}: {
  clubId: string;
  teamId: string;
  members: any[];
  availableMembers: any[];
  clubMembers: any[];
  isAdmin: boolean;
  onChange: () => Promise<void>;
}) {
  const [selected, setSelected] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // Map a player's user_id to their club_members id, so we can link a squad
  // row to the full member detail page (only known when club members loaded).
  const memberIdByUserId = new Map<string, string>(
    (clubMembers || []).map((cm: any) => [cm.user_id, cm.id]),
  );

  async function handleAdd() {
    if (!selected) return;
    setAdding(true);
    try {
      await apiFetch(`/clubs/${clubId}/teams/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ user_id: selected }),
      });
      setSelected("");
      setShowAdd(false);
      await onChange();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  }

  async function toggleCaptain(m: any) {
    try {
      await apiFetch(`/clubs/${clubId}/teams/${teamId}/members/${m.user_id}`, {
        method: "PUT",
        body: JSON.stringify({ is_captain: !m.is_captain }),
      });
      await onChange();
    } catch (err) {
      console.error(err);
    }
  }

  async function remove(m: any) {
    if (!confirm(`Remove ${memberName(m)} from this team?`)) return;
    try {
      await apiFetch(`/clubs/${clubId}/teams/${teamId}/members/${m.user_id}`, {
        method: "DELETE",
      });
      await onChange();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-medium tracking-[0.08em] uppercase text-[var(--color-ink-soft)]">
          Roster
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[12px] tabular-nums text-[var(--color-ink-muted)]">
            {members.length} {members.length === 1 ? "player" : "players"}
          </span>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12.5px] font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-rich)] transition-colors"
            >
              <UserPlus size={14} strokeWidth={2.25} />
              Add player
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <Modal open={showAdd} onClose={() => setShowAdd(false)} eyebrow="Roster" title="Add player">
          <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[var(--color-ink)] mb-1.5">
                Player
              </label>
              {availableMembers.length === 0 ? (
                <p className="text-[13px] text-[var(--color-ink-soft)]">
                  Everyone in the club is already on this team. Add more members on the Members tab first.
                </p>
              ) : (
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  autoFocus
                  className="w-full h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13.5px] focus:border-[var(--color-ink)] focus:outline-none"
                >
                  <option value="">Select a member…</option>
                  {availableMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {memberName(m)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <ModalActions>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="h-9 px-3 rounded-md text-[13px] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selected || adding}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
              >
                <UserPlus size={14} strokeWidth={2.25} />
                {adding ? "Adding…" : "Add player"}
              </button>
            </ModalActions>
          </form>
        </Modal>
      )}

      <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] overflow-hidden">
        {members.length === 0 ? (
          <div className="p-10 flex flex-col items-center text-center">
            <div className="h-10 w-10 rounded-lg bg-[var(--color-bg-soft)] border border-[var(--color-rule)] flex items-center justify-center mb-3">
              <Users size={18} strokeWidth={1.6} className="text-[var(--color-ink-soft)]" />
            </div>
            <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">No players yet</h3>
            <p className="mt-1 text-[12.5px] text-[var(--color-ink-soft)]">Add players from the club roster.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
                <Th>Player</Th>
                <Th className="hidden md:table-cell">Email</Th>
                <Th>Role</Th>
                {isAdmin && <Th className="text-right">Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const profile = m.profile || {};
                const memberId = memberIdByUserId.get(m.user_id);
                const NameCell = (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--color-bg-soft)] ring-1 ring-[var(--color-rule)] flex items-center justify-center overflow-hidden shrink-0">
                      {profile.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[11px] font-semibold text-[var(--color-ink-soft)]">
                          {(profile.first_name?.[0] || profile.email?.[0] || "?").toUpperCase()}
                          {(profile.last_name?.[0] || "").toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[13.5px] font-medium text-[var(--color-ink)] truncate ${memberId ? "group-hover:text-[var(--color-accent-ink)]" : ""}`}>
                          {memberName(m)}
                        </span>
                        {profile.is_placeholder && (
                          <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium uppercase tracking-wide bg-[var(--color-bg-soft)] text-[var(--color-ink-muted)] border border-[var(--color-rule)]">
                            <UserPlus size={9} strokeWidth={2} />
                            Off-app
                          </span>
                        )}
                      </div>
                      <div className="md:hidden text-[11.5px] text-[var(--color-ink-muted)] truncate">{profile.email || "—"}</div>
                    </div>
                  </div>
                );
                return (
                  <tr key={m.id} className="border-b border-[var(--color-rule)] last:border-0 hover:bg-[var(--color-bg-soft)] transition-colors group">
                    <td className="px-4 py-3">
                      {memberId ? (
                        <Link href={`/club/${clubId}/members/${memberId}`} className="no-underline">
                          {NameCell}
                        </Link>
                      ) : (
                        NameCell
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-[12.5px] text-[var(--color-ink-soft)]">{profile.email || "—"}</td>
                    <td className="px-4 py-3">
                      {m.is_captain ? (
                        <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full text-[10.5px] font-medium bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border border-[var(--color-rule)]">
                          <Crown size={11} strokeWidth={2} />
                          Captain
                        </span>
                      ) : (
                        <span className="text-[12px] text-[var(--color-ink-muted)]">Player</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleCaptain(m)}
                            className="h-8 px-2.5 rounded-md text-[12px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-card)] border border-transparent hover:border-[var(--color-rule)] transition-colors"
                          >
                            {m.is_captain ? "Unset captain" : "Make captain"}
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(m)}
                            aria-label="Remove player"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-colors"
                          >
                            <Trash2 size={15} strokeWidth={1.9} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
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

/* ---------------- Games ---------------- */

function GamesSection({
  clubId,
  teamId,
  games,
  isAdmin,
  onChange,
}: {
  clubId: string;
  teamId: string;
  games: any[];
  isAdmin: boolean;
  onChange: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    opponent: "",
    location: "",
    game_date: todayIso(),
    game_time: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/clubs/${clubId}/teams/${teamId}/games`, {
        method: "POST",
        body: JSON.stringify({
          opponent: form.opponent,
          location: form.location || null,
          game_date: form.game_date,
          game_time: form.game_time || null,
          notes: form.notes || null,
        }),
      });
      setForm({ opponent: "", location: "", game_date: todayIso(), game_time: "", notes: "" });
      setShowForm(false);
      await onChange();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-medium tracking-[0.08em] uppercase text-[var(--color-ink-soft)]">
          Games
        </h2>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12.5px] font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-rich)] transition-colors"
          >
            <Plus size={14} strokeWidth={2.25} />
            Add game
          </button>
        )}
      </div>

      {isAdmin && (
        <Modal open={showForm} onClose={() => setShowForm(false)} eyebrow="New fixture" title="Add game">
          <form onSubmit={handleCreate} className="space-y-3">
          <Field label="Opponent">
            <input
              value={form.opponent}
              onChange={(e) => setForm({ ...form, opponent: e.target.value })}
              required
              placeholder="Riverside CC"
              className={inputCls}
            />
          </Field>
          <Field label="Location" optional>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Central Oval"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                type="date"
                value={form.game_date}
                onChange={(e) => setForm({ ...form, game_date: e.target.value })}
                required
                className={inputCls}
              />
            </Field>
            <Field label="Time" optional>
              <input
                type="time"
                value={form.game_time}
                onChange={(e) => setForm({ ...form, game_time: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Notes" optional>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Arrive 30 minutes early"
              className={inputCls}
            />
          </Field>
          <ModalActions>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-9 px-3 rounded-md text-[13px] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
            >
              {saving ? "Adding…" : "Add game"}
            </button>
          </ModalActions>
          </form>
        </Modal>
      )}

      {games.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No games scheduled" hint="Add a fixture to get started." />
      ) : (
        <ul className="flex flex-col gap-2">
          {games.map((g) => (
            <li key={g.id}>
              <Link
                href={`/club/${clubId}/games/${g.id}`}
                className="group flex items-center gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-4 hover:border-[var(--color-ink-faint)] hover:shadow-[var(--shadow-lifted)] transition-all no-underline text-[var(--color-ink)]"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold leading-tight text-[var(--color-ink)] truncate">
                    vs {g.opponent}
                  </h3>
                  <p className="mt-1 text-[12.5px] text-[var(--color-ink-soft)]">
                    {formatDate(g.game_date)}
                    {g.game_time ? ` · ${formatTime(g.game_time)}` : ""}
                    {g.location ? (
                      <span className="inline-flex items-center gap-1 ml-1">
                        <MapPin size={11} strokeWidth={1.9} className="inline" />
                        {g.location}
                      </span>
                    ) : null}
                  </p>
                </div>
                <span className="text-[11.5px] tabular-nums text-[var(--color-ink-muted)] shrink-0">
                  {g.selection_count ?? 0} selected
                </span>
                <ArrowUpRight
                  size={15}
                  strokeWidth={1.75}
                  className="text-[var(--color-ink-faint)] group-hover:text-[var(--color-accent)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Team expenses ---------------- */

function ExpensesSection({
  clubId,
  teamId,
  games,
  data,
  onChange,
}: {
  clubId: string;
  teamId: string;
  games: any[];
  data: any;
  onChange: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    expense_date: todayIso(),
    game_id: "",
  });
  const [splitAmongPlayers, setSplitAmongPlayers] = useState(true);
  const [saving, setSaving] = useState(false);

  const expenses: any[] = data?.expenses || [];
  const total: number = data?.total_cents ?? 0;

  // When a game is chosen, we can split the cost across its selected players.
  const selectedGame = games.find((g) => g.id === form.game_id);
  const gameSelectedCount = selectedGame?.selection_count ?? 0;
  const canSplitByGame = Boolean(form.game_id) && gameSelectedCount > 0;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/clubs/${clubId}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          description: form.description,
          amount_cents: dollarsToCents(form.amount),
          expense_date: form.expense_date || null,
          team_id: teamId,
          game_id: form.game_id || null,
          // Split equally across the chosen game's selected players, when applicable.
          assign_all: canSplitByGame && splitAmongPlayers ? true : undefined,
        }),
      });
      setForm({ description: "", amount: "", expense_date: todayIso(), game_id: "" });
      setSplitAmongPlayers(true);
      setShowForm(false);
      await onChange();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-medium tracking-[0.08em] uppercase text-[var(--color-ink-soft)]">
          Team expenses
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold tabular-nums text-[var(--color-ink)]">
            {formatCurrency(total)}
          </span>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12.5px] font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-rich)] transition-colors"
          >
            <Plus size={14} strokeWidth={2.25} />
            Add expense
          </button>
        </div>
      </div>

      {showForm && (
        <Modal open={showForm} onClose={() => setShowForm(false)} eyebrow="New expense" title="Add team expense">
          <form onSubmit={handleCreate} className="space-y-3">
          <Field label="Description">
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              placeholder="Ground booking"
              className={inputCls}
            />
          </Field>
          <Field label="Amount ($)">
            <input
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              placeholder="120.00"
              className={inputCls}
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Game" optional>
            <select
              value={form.game_id}
              onChange={(e) => setForm({ ...form, game_id: e.target.value })}
              className={inputCls}
            >
              <option value="">No specific game</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  vs {g.opponent}
                  {g.game_date ? ` · ${formatDate(g.game_date)}` : ""}
                </option>
              ))}
            </select>
          </Field>
          {form.game_id && (
            canSplitByGame ? (
              <label className="flex items-start gap-2.5 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)]/40 px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={splitAmongPlayers}
                  onChange={(e) => setSplitAmongPlayers(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[var(--color-rule-strong)] accent-[var(--color-accent)]"
                />
                <span className="text-[12.5px] text-[var(--color-ink-soft)] leading-relaxed">
                  Split equally among the{" "}
                  <span className="font-medium text-[var(--color-ink)]">{gameSelectedCount}</span> selected{" "}
                  {gameSelectedCount === 1 ? "player" : "players"} for this game
                </span>
              </label>
            ) : (
              <p className="text-[12px] text-[var(--color-ink-muted)]">
                No players selected for that game yet — this expense won&apos;t be split.
              </p>
            )
          )}
          <ModalActions>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-9 px-3 rounded-md text-[13px] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
            >
              {saving ? "Adding…" : "Add expense"}
            </button>
          </ModalActions>
          </form>
        </Modal>
      )}

      {expenses.length === 0 ? (
        <EmptyState icon={Receipt} title="No team expenses" hint="Log spending tied to this team." />
      ) : (
        <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
                <Th>Expense</Th>
                <Th className="hidden sm:table-cell">Date</Th>
                <Th className="text-right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((ex) => (
                <tr key={ex.id} className="border-b border-[var(--color-rule)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-medium text-[var(--color-ink)]">{ex.description}</span>
                      {ex.category && (
                        <span className="inline-flex items-center px-2 h-5 rounded-full text-[10.5px] font-medium bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]">
                          {EXPENSE_CATEGORY_LABELS[ex.category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? ex.category}
                        </span>
                      )}
                      {ex.game?.opponent && (
                        <span className="inline-flex items-center px-2 h-5 rounded-full text-[10.5px] font-medium bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)] border border-[var(--color-rule)]">
                          vs {ex.game.opponent}
                        </span>
                      )}
                    </div>
                    {ex.expense_date && (
                      <div className="sm:hidden text-[11.5px] text-[var(--color-ink-muted)] mt-0.5">
                        {formatDate(ex.expense_date)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-[12.5px] text-[var(--color-ink-soft)] whitespace-nowrap">
                    {ex.expense_date ? formatDate(ex.expense_date) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-[13.5px] font-semibold tabular-nums text-[var(--color-ink)] whitespace-nowrap">
                    {formatCurrency(ex.amount_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------------- Shared bits ---------------- */

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

function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Users;
  title: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-rule-strong)] bg-[var(--color-bg-sunken)] p-10 flex flex-col items-center text-center">
      <div className="h-10 w-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-rule)] flex items-center justify-center mb-3">
        <Icon size={18} strokeWidth={1.6} className="text-[var(--color-ink-soft)]" />
      </div>
      <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{title}</h3>
      <p className="mt-1 text-[12.5px] text-[var(--color-ink-soft)]">{hint}</p>
    </div>
  );
}

function memberName(m: any): string {
  const p = m.profile || {};
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return name || p.full_name || p.name || p.email || "Unknown";
}
