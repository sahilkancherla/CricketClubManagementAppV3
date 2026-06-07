"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ListChecks,
  MapPin,
  Pencil,
  Plus,
  Receipt,
  Share2,
  Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";
import { Modal, ModalActions } from "@/components/Modal";
import { formatCurrency, formatDate, formatTime, toInputTime, dollarsToCents, todayIso } from "@/lib/utils";
import { EXPENSE_CATEGORY_LABELS } from "@cricket/shared";

export default function GameDetailPage({
  params,
}: {
  params: Promise<{ clubId: string; gameId: string }>;
}) {
  const { clubId, gameId } = use(params);
  const router = useRouter();

  const [game, setGame] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [expenseData, setExpenseData] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = roles.includes("admin");
  const isCaptain = roles.includes("captain");

  async function loadGame() {
    const data = await apiFetch(`/clubs/${clubId}/games/${gameId}`);
    setGame(data);
    return data;
  }

  async function loadExpenses() {
    try {
      const data = await apiFetch(`/clubs/${clubId}/expenses?game_id=${gameId}`);
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

        const g = await loadGame();
        if (g?.team?.id) {
          try {
            const team = await apiFetch(`/clubs/${clubId}/teams/${g.team.id}`);
            setRoster(team?.members || []);
          } catch {
            /* ignore */
          }
        }
        if (r.includes("admin")) await loadExpenses();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, gameId]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-9 w-72 rounded bg-[var(--color-bg-soft)] animate-pulse" />
        <div className="h-48 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] animate-pulse" />
      </div>
    );
  }

  if (!game) {
    return <p className="text-[13px] text-[var(--color-ink-soft)]">Game not found.</p>;
  }

  const teamId = game.team?.id;

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <BackButton href={`/club/${clubId}/teams/${teamId}`} label={game.team?.name || "Team"} />
        <div>
          <h1 className="font-display text-[28px] leading-[1.1] font-semibold text-[var(--color-ink)]">
            {game.team?.name} vs {game.opponent}
          </h1>
          <p className="mt-1.5 text-[13px] text-[var(--color-ink-soft)] flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} strokeWidth={1.9} />
              {formatDate(game.game_date)}
              {game.game_time ? ` · ${formatTime(game.game_time)}` : ""}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} strokeWidth={1.9} />
              {game.location || "TBD"}
            </span>
          </p>
          {game.notes && (
            <p className="mt-2 text-[13px] text-[var(--color-ink-soft)] leading-relaxed max-w-2xl">
              {game.notes}
            </p>
          )}
        </div>
      </header>

      <SelectionSection
        clubId={clubId}
        gameId={gameId}
        game={game}
        roster={roster}
        canEdit={isAdmin || isCaptain}
        onChange={loadGame}
      />

      {isAdmin && teamId && (
        <GameExpensesSection
          clubId={clubId}
          gameId={gameId}
          teamId={teamId}
          selectedCount={(game.selection || []).length}
          data={expenseData}
          onChange={loadExpenses}
        />
      )}

      {isAdmin && (
        <EditGameSection
          clubId={clubId}
          gameId={gameId}
          game={game}
          onSaved={loadGame}
          onDeleted={() => router.push(`/club/${clubId}/teams/${teamId}`)}
        />
      )}
    </div>
  );
}

/* ---------------- Selection / Playing XI ---------------- */

function SelectionSection({
  clubId,
  gameId,
  game,
  roster,
  canEdit,
  onChange,
}: {
  clubId: string;
  gameId: string;
  game: any;
  roster: any[];
  canEdit: boolean;
  onChange: () => Promise<any>;
}) {
  const selection: any[] = (game.selection || [])
    .slice()
    .sort((a: any, b: any) => (a.batting_order ?? 0) - (b.batting_order ?? 0));

  // Ordered list of selected user_ids (in batting order).
  const [order, setOrder] = useState<string[]>(selection.map((s) => s.user_id));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Lookup of user_id -> display name from roster (fallback to selection profiles).
  const nameById = new Map<string, string>();
  roster.forEach((m) => nameById.set(m.user_id, playerName(m)));
  selection.forEach((s) => {
    if (!nameById.has(s.user_id)) nameById.set(s.user_id, playerName(s));
  });

  function nameOf(userId: string) {
    return nameById.get(userId) || "Unknown";
  }

  function toggle(userId: string) {
    setOrder((prev) =>
      prev.includes(userId) ? prev.filter((u) => u !== userId) : [...prev, userId]
    );
  }

  function move(userId: string, dir: -1 | 1) {
    setOrder((prev) => {
      const idx = prev.indexOf(userId);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = prev.slice();
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  }

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/clubs/${clubId}/games/${gameId}/selection`, {
        method: "PUT",
        body: JSON.stringify({ user_ids: order }),
      });
      setEditing(false);
      await onChange();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // WhatsApp message from the SAVED selection (batting order).
  const savedNames = selection.map((s) => nameOf(s.user_id));
  const message = buildMessage(game, savedNames);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error(err);
    }
  }

  // Roster ordered for the editor: selected first (in order), then the rest.
  const selectedSet = new Set(order);
  const orderedSelected = order.filter((id) => nameById.has(id) || true);
  const unselected = roster.filter((m) => !selectedSet.has(m.user_id));

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-medium tracking-[0.08em] uppercase text-[var(--color-ink-soft)]">
          Playing XI
        </h2>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setOrder(selection.map((s) => s.user_id));
              setEditing(true);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12.5px] font-medium border border-[var(--color-rule-strong)] text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors"
          >
            <ListChecks size={14} strokeWidth={2} />
            Edit selection
          </button>
        )}
      </div>

      {/* Saved selection display */}
      {selection.length === 0 ? (
        <EmptyState icon={ListChecks} title="No players selected" hint="Pick the playing XI to share it." />
      ) : (
        <ol className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] divide-y divide-[var(--color-rule)] overflow-hidden">
          {selection.map((s, i) => (
            <li key={s.id ?? s.user_id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-6 text-[12px] tabular-nums font-medium text-[var(--color-ink-muted)]">
                {i + 1}.
              </span>
              <span className="text-[14px] text-[var(--color-ink)]">{nameOf(s.user_id)}</span>
            </li>
          ))}
        </ol>
      )}

      {/* WhatsApp export */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] no-underline transition-colors shadow-[var(--shadow-soft)]"
        >
          <Share2 size={14} strokeWidth={2.1} />
          Share to WhatsApp
        </a>
        <button
          type="button"
          onClick={copyMessage}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md border border-[var(--color-rule-strong)] text-[13px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors"
        >
          {copied ? <Check size={14} strokeWidth={2.2} /> : <Copy size={14} strokeWidth={2} />}
          {copied ? "Copied!" : "Copy message"}
        </button>
      </div>

      {/* Selection editor modal */}
      {canEdit && (
        <Modal open={editing} onClose={() => setEditing(false)} eyebrow="Playing XI" title="Edit selection" size="lg">
          <p className="text-[12px] text-[var(--color-ink-soft)] mb-3">
            Check players in and use the arrows to set batting order.
          </p>

          {order.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[var(--color-ink-muted)] mb-2">
                Selected · batting order
              </p>
              <ul className="flex flex-col gap-1.5">
                {orderedSelected.map((userId, i) => (
                  <li
                    key={userId}
                    className="flex items-center gap-2 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)] px-3 py-2"
                  >
                    <span className="w-5 text-[12px] tabular-nums font-medium text-[var(--color-ink-muted)]">
                      {i + 1}.
                    </span>
                    <span className="flex-1 text-[13.5px] text-[var(--color-ink)] truncate">
                      {nameOf(userId)}
                    </span>
                    <button
                      type="button"
                      onClick={() => move(userId, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-card)] disabled:opacity-30"
                    >
                      <ChevronUp size={15} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(userId, 1)}
                      disabled={i === order.length - 1}
                      aria-label="Move down"
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-card)] disabled:opacity-30"
                    >
                      <ChevronDown size={15} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(userId)}
                      className="h-7 px-2 inline-flex items-center rounded-md text-[12px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {unselected.length > 0 && (
            <div>
              <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[var(--color-ink-muted)] mb-2">
                Available
              </p>
              <ul className="flex flex-col gap-1.5">
                {unselected.map((m) => (
                  <li
                    key={m.user_id}
                    className="flex items-center gap-2 rounded-md border border-[var(--color-rule)] px-3 py-2"
                  >
                    <span className="flex-1 text-[13.5px] text-[var(--color-ink)] truncate">
                      {playerName(m)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggle(m.user_id)}
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[12px] font-medium text-[var(--color-accent-ink)] bg-[var(--color-accent-soft)] hover:opacity-90"
                    >
                      <Plus size={13} strokeWidth={2.2} />
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {roster.length === 0 && (
            <p className="text-[13px] text-[var(--color-ink-soft)]">
              No players on this team yet. Add players to the team first.
            </p>
          )}

          <ModalActions>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-9 px-3 rounded-md text-[13px] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save selection"}
            </button>
          </ModalActions>
        </Modal>
      )}
    </section>
  );
}

function buildMessage(game: any, names: string[]): string {
  const lines = [
    `🏏 ${game.team?.name} vs ${game.opponent}`,
    `📅 ${formatDate(game.game_date)}${game.game_time ? " · " + formatTime(game.game_time) : ""}`,
    `📍 ${game.location || "TBD"}`,
    "",
    "Playing XI:",
  ];
  if (names.length === 0) {
    lines.push("TBD");
  } else {
    names.forEach((n, i) => lines.push(`${i + 1}. ${n}`));
  }
  return lines.join("\n");
}

/* ---------------- Game expenses ---------------- */

function GameExpensesSection({
  clubId,
  gameId,
  teamId,
  selectedCount,
  data,
  onChange,
}: {
  clubId: string;
  gameId: string;
  teamId: string;
  selectedCount: number;
  data: any;
  onChange: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    expense_date: todayIso(),
  });
  const [splitAmongPlayers, setSplitAmongPlayers] = useState(true);
  const [saving, setSaving] = useState(false);

  const expenses: any[] = data?.expenses || [];
  const total: number = data?.total_cents ?? 0;

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
          game_id: gameId,
          team_id: teamId,
          // Split equally across the game's selected players, when chosen.
          assign_all: selectedCount > 0 && splitAmongPlayers ? true : undefined,
        }),
      });
      setForm({ description: "", amount: "", expense_date: todayIso() });
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
          Game expenses
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
        <Modal open={showForm} onClose={() => setShowForm(false)} eyebrow="New expense" title="Add game expense">
          <form onSubmit={handleCreate} className="space-y-3">
          <Field label="Description">
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              placeholder="Match fee"
              className={inputCls}
            />
          </Field>
          <Field label="Amount ($)">
            <input
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              placeholder="60.00"
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
          {selectedCount > 0 ? (
            <label className="flex items-start gap-2.5 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)]/40 px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={splitAmongPlayers}
                onChange={(e) => setSplitAmongPlayers(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[var(--color-rule-strong)] accent-[var(--color-accent)]"
              />
              <span className="text-[12.5px] text-[var(--color-ink-soft)] leading-relaxed">
                Split equally among the{" "}
                <span className="font-medium text-[var(--color-ink)]">{selectedCount}</span> selected{" "}
                {selectedCount === 1 ? "player" : "players"} for this game
              </span>
            </label>
          ) : (
            <p className="text-[12px] text-[var(--color-ink-muted)]">
              No players selected for this game yet — this expense won&apos;t be split.
            </p>
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
        <EmptyState icon={Receipt} title="No game expenses" hint="Log spending tied to this game." />
      ) : (
        <ul className="flex flex-col gap-2">
          {expenses.map((ex) => (
            <li
              key={ex.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-[var(--color-ink)] truncate">
                    {ex.description}
                  </span>
                  {ex.category && (
                    <span className="inline-flex items-center px-2 h-5 rounded-full text-[10.5px] font-medium bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]">
                      {EXPENSE_CATEGORY_LABELS[ex.category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? ex.category}
                    </span>
                  )}
                </div>
                {ex.expense_date && (
                  <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
                    {formatDate(ex.expense_date)}
                  </p>
                )}
              </div>
              <span className="text-[14px] font-semibold tabular-nums text-[var(--color-ink)] shrink-0">
                {formatCurrency(ex.amount_cents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Edit / delete game ---------------- */

function EditGameSection({
  clubId,
  gameId,
  game,
  onSaved,
  onDeleted,
}: {
  clubId: string;
  gameId: string;
  game: any;
  onSaved: () => Promise<any>;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    opponent: game.opponent || "",
    location: game.location || "",
    game_date: game.game_date || todayIso(),
    game_time: toInputTime(game.game_time),
    notes: game.notes || "",
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/clubs/${clubId}/games/${gameId}`, {
        method: "PUT",
        body: JSON.stringify({
          opponent: form.opponent,
          location: form.location || null,
          game_date: form.game_date,
          game_time: form.game_time || null,
          notes: form.notes || null,
        }),
      });
      setEditing(false);
      await onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this game? This cannot be undone.")) return;
    try {
      await apiFetch(`/clubs/${clubId}/games/${gameId}`, { method: "DELETE" });
      onDeleted();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-medium tracking-[0.08em] uppercase text-[var(--color-ink-soft)]">
          Manage game
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-[var(--color-rule-strong)] text-[12.5px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors"
          >
            <Pencil size={14} strokeWidth={1.9} />
            Edit game
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12.5px] font-medium text-[var(--color-danger)] bg-[var(--color-danger-soft)] hover:opacity-90 transition-opacity"
          >
            <Trash2 size={14} strokeWidth={1.9} />
            Delete
          </button>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} eyebrow="Manage game" title="Edit game">
        <form onSubmit={handleSave} className="space-y-3">
          <Field label="Opponent">
            <input
              value={form.opponent}
              onChange={(e) => setForm({ ...form, opponent: e.target.value })}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Location" optional>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
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
              className={inputCls}
            />
          </Field>
          <ModalActions>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-9 px-3 rounded-md text-[13px] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </ModalActions>
        </form>
      </Modal>
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
  icon: typeof ListChecks;
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

function playerName(m: any): string {
  const p = m.profile || {};
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return name || p.full_name || p.name || p.email || "Unknown";
}
