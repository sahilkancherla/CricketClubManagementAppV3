"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarPlus, Check, ChevronDown, ChevronRight, Plus, Search, Trophy, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";
import { Modal, ModalActions } from "@/components/Modal";

const FIELD =
  "w-full h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13px] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10";
const LABEL = "block text-[12px] font-medium text-[var(--color-ink)] mb-1.5";

const ALL = "__all__";

export default function TeamsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const [roles, setRoles] = useState<string[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [showNewSeason, setShowNewSeason] = useState(false);
  const [showNewTeam, setShowNewTeam] = useState(false);

  const isAdmin = roles.includes("admin");

  async function loadYears(): Promise<any[]> {
    const data = await apiFetch(`/clubs/${clubId}/years`).catch(() => []);
    setYears(data || []);
    return data || [];
  }

  async function loadTeams(yearId: string) {
    setTeamsLoading(true);
    try {
      const qs = yearId === ALL || !yearId ? "" : `?year_id=${yearId}`;
      const data = await apiFetch(`/clubs/${clubId}/teams${qs}`);
      setTeams(data || []);
    } catch (err) {
      console.error(err);
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const [myClubs, yearsData] = await Promise.all([
          apiFetch("/clubs").catch(() => []),
          loadYears(),
        ]);
        const entry = (myClubs || []).find((c: any) => c.club_id === clubId);
        setRoles(entry?.roles || []);
        // Default to active year, else most recent (years are desc by year)
        const active = (yearsData || []).find((y: any) => y.is_active);
        const initial = active?.id || yearsData?.[0]?.id || ALL;
        setSelectedYearId(initial);
        await loadTeams(initial);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  function selectYear(yearId: string) {
    setSelectedYearId(yearId);
    loadTeams(yearId);
  }

  const selectedYear = useMemo(
    () => years.find((y) => y.id === selectedYearId),
    [years, selectedYearId],
  );

  // "All years" view: group teams under their season, ordered like `years` (desc).
  const groupedByYear = useMemo(() => {
    if (selectedYearId !== ALL) return [];
    const byYear = new Map<string, any[]>();
    for (const t of teams) {
      const key = t.year_id || t.year?.id || "__unknown__";
      if (!byYear.has(key)) byYear.set(key, []);
      byYear.get(key)!.push(t);
    }
    return years
      .map((y) => ({ year: y, teams: byYear.get(y.id) || [] }))
      .filter((g) => g.teams.length > 0);
  }, [teams, years, selectedYearId]);

  // Toggle a season's active status (admin only). Optimistic with revert on failure.
  const [togglingYearId, setTogglingYearId] = useState<string | null>(null);
  async function setYearActive(yearId: string, active: boolean) {
    setTogglingYearId(yearId);
    setYears((prev) => prev.map((y) => (y.id === yearId ? { ...y, is_active: active } : y)));
    try {
      await apiFetch(`/clubs/${clubId}/years/${yearId}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: active }),
      });
    } catch (err) {
      console.error(err);
      setYears((prev) => prev.map((y) => (y.id === yearId ? { ...y, is_active: !active } : y)));
    } finally {
      setTogglingYearId(null);
    }
  }

  // Track which season groups are expanded in the "All years" view (collapsed by default).
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  function toggleYear(yearId: string) {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(yearId)) next.delete(yearId);
      else next.add(yearId);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-56 rounded bg-[var(--color-bg-soft)] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <BackButton href={`/club/${clubId}`} label="Back to club" />
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-[28px] font-semibold text-[var(--color-ink)]">Seasons &amp; Teams</h1>
            <p className="mt-1 text-[13.5px] text-[var(--color-ink-soft)]">
              Browse teams by season. Past seasons stay available for history.
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewSeason(true)}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] text-[13px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors"
              >
                <CalendarPlus size={14} strokeWidth={2} />
                New season
              </button>
              <button
                onClick={() => setShowNewTeam(true)}
                disabled={years.length === 0}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors shadow-[var(--shadow-soft)]"
              >
                <Plus size={14} strokeWidth={2.25} />
                New team
              </button>
            </div>
          )}
        </div>
      </header>

      {isAdmin && (
        <Modal open={showNewSeason} onClose={() => setShowNewSeason(false)} eyebrow="New season" title="Create a season">
          <NewSeasonPanel
            clubId={clubId}
            onClose={() => setShowNewSeason(false)}
            onCreated={async (created) => {
              setShowNewSeason(false);
              await loadYears();
              if (created?.id) selectYear(created.id);
            }}
          />
        </Modal>
      )}

      {isAdmin && years.length > 0 && (
        <Modal open={showNewTeam} onClose={() => setShowNewTeam(false)} eyebrow="New team" title="Create a team">
          <NewTeamPanel
            clubId={clubId}
            years={years}
            defaultYearId={selectedYearId === ALL ? years[0]?.id : selectedYearId}
            onClose={() => setShowNewTeam(false)}
            onCreated={async (yearId) => {
              setShowNewTeam(false);
              if (selectedYearId === ALL || selectedYearId === yearId) {
                await loadTeams(selectedYearId);
              } else {
                selectYear(yearId);
              }
            }}
          />
        </Modal>
      )}

      {years.length === 0 ? (
        <div className="border border-dashed border-[var(--color-rule-strong)] rounded-xl bg-[var(--color-bg-sunken)] p-14 flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-rule)] flex items-center justify-center mb-4 shadow-[var(--shadow-soft)]">
            <CalendarPlus size={18} strokeWidth={1.6} className="text-[var(--color-ink-soft)]" />
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)] mb-1">No seasons yet</h3>
          <p className="text-[13px] text-[var(--color-ink-soft)] max-w-xs">
            {isAdmin ? "Create a season to start organising teams." : "This club hasn't set up any seasons yet."}
          </p>
        </div>
      ) : (
        <>
          {/* Season selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <SeasonSelect
              years={years}
              selectedYearId={selectedYearId}
              onSelect={selectYear}
            />
            <span className="text-[12px] text-[var(--color-ink-muted)] tabular-nums">
              {years.length} {years.length === 1 ? "season" : "seasons"}
            </span>
          </div>

          {/* Selected season — overview with stats and a small active toggle */}
          {selectedYearId !== ALL && selectedYear && !teamsLoading && (
            <section className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-5">
              <div className="min-w-0">
                <p className="text-[10px] font-medium tracking-[0.14em] uppercase text-[var(--color-accent)]">Season</p>
                <h2 className="font-display text-[22px] leading-tight font-semibold text-[var(--color-ink)] truncate">
                  {selectedYear.label || selectedYear.year}
                </h2>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
                <SeasonStat label="Teams" value={String(teams.length)} />
                <SeasonStat
                  label="Squad spots"
                  value={String(teams.reduce((s, t) => s + (t.member_count ?? 0), 0))}
                />
                <div className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-bg-soft)]/40 px-3.5 py-3 flex items-center justify-between gap-2">
                  <div>
                    <dd className={`font-display text-[22px] leading-none font-semibold ${selectedYear.is_active ? "text-[var(--color-accent)]" : "text-[var(--color-ink)]"}`}>
                      {selectedYear.is_active ? "Active" : "Inactive"}
                    </dd>
                    <dt className="mt-1.5 text-[11.5px] text-[var(--color-ink-soft)]">Status</dt>
                  </div>
                  {isAdmin && (
                    <SeasonToggle
                      active={!!selectedYear.is_active}
                      disabled={togglingYearId === selectedYear.id}
                      onChange={(next) => setYearActive(selectedYear.id, next)}
                    />
                  )}
                </div>
              </dl>
            </section>
          )}

          {/* Teams */}
          {teamsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-24 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] animate-pulse" />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <div className="border border-[var(--color-rule)] rounded-xl p-12 text-center bg-[var(--color-bg-card)]">
              <div className="mx-auto h-10 w-10 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center mb-3">
                <Trophy size={16} strokeWidth={1.75} className="text-[var(--color-ink-muted)]" />
              </div>
              <p className="text-[13px] text-[var(--color-ink-soft)]">
                {selectedYearId === ALL
                  ? "No teams yet."
                  : `No teams in ${selectedYear?.label || selectedYear?.year || "this season"}.`}
              </p>
            </div>
          ) : selectedYearId === ALL ? (
            /* Grouped by season — collapsible headers scale to many seasons */
            <div className="space-y-2">
              {groupedByYear.map(({ year, teams: yearTeams }) => {
                const open = expandedYears.has(year.id);
                return (
                  <div key={year.id} className="border border-[var(--color-rule)] rounded-xl bg-[var(--color-bg-card)] overflow-hidden">
                    <div className="flex items-center gap-3 px-4 h-12">
                      <button
                        onClick={() => toggleYear(year.id)}
                        aria-expanded={open}
                        className="flex items-center gap-3 flex-1 min-w-0 h-full text-left"
                      >
                        {open ? (
                          <ChevronDown size={15} strokeWidth={2} className="text-[var(--color-ink-muted)] shrink-0" />
                        ) : (
                          <ChevronRight size={15} strokeWidth={2} className="text-[var(--color-ink-muted)] shrink-0" />
                        )}
                        <span className="text-[14px] font-semibold text-[var(--color-ink)] truncate">
                          {year.label || year.year}
                        </span>
                        {year.is_active && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] shrink-0" title="Active season" />
                        )}
                        <span className="ml-auto text-[12px] tabular-nums text-[var(--color-ink-muted)] shrink-0">
                          {yearTeams.length} {yearTeams.length === 1 ? "team" : "teams"}
                        </span>
                      </button>
                      {isAdmin && (
                        <SeasonToggle
                          active={!!year.is_active}
                          disabled={togglingYearId === year.id}
                          onChange={(next) => setYearActive(year.id, next)}
                        />
                      )}
                    </div>
                    {open && (
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border-t border-[var(--color-rule)]">
                        {yearTeams.map((t) => (
                          <li key={t.id}>
                            <TeamCard clubId={clubId} team={t} showSeason={false} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teams.map((t) => (
                <li key={t.id}>
                  <TeamCard clubId={clubId} team={t} showSeason />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function TeamCard({ clubId, team: t, showSeason }: { clubId: string; team: any; showSeason: boolean }) {
  return (
    <Link
      href={`/club/${clubId}/teams/${t.id}`}
      className="group relative block border border-[var(--color-rule)] rounded-xl p-5 bg-[var(--color-bg-card)] hover:border-[var(--color-ink-faint)] hover:shadow-[var(--shadow-lifted)] transition-all duration-200 no-underline text-[var(--color-ink)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {showSeason && (
            <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] tabular-nums mb-1.5">
              {t.year?.label || t.year?.year || ""}
            </div>
          )}
          <h3 className="font-display text-[18px] font-semibold leading-tight tracking-tight">{t.name}</h3>
          {t.description && (
            <p className="text-[13px] text-[var(--color-ink-soft)] mt-1.5 line-clamp-2 leading-relaxed">
              {t.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-3 text-[12px] text-[var(--color-ink-soft)]">
            <Users size={13} strokeWidth={1.75} className="text-[var(--color-ink-muted)]" />
            <span className="tabular-nums">{t.member_count ?? 0}</span>
            <span>{t.member_count === 1 ? "member" : "members"}</span>
          </div>
        </div>
        <ArrowUpRight
          size={16}
          strokeWidth={1.75}
          className="text-[var(--color-ink-muted)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0"
        />
      </div>
    </Link>
  );
}

function SeasonToggle({
  active,
  disabled,
  onChange,
}: {
  active: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={active ? "Deactivate season" : "Activate season"}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!active);
      }}
      className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        active ? "bg-[var(--color-accent)]" : "bg-[var(--color-ink-faint)]"
      }`}
    >
      <span
        className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
          active ? "translate-x-[14px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SeasonStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-bg-soft)]/40 px-3.5 py-3">
      <dd className={`font-display text-[22px] leading-none font-semibold tabular-nums ${accent ? "text-[var(--color-accent)]" : "text-[var(--color-ink)]"}`}>
        {value}
      </dd>
      <dt className="mt-1.5 text-[11.5px] text-[var(--color-ink-soft)]">{label}</dt>
    </div>
  );
}

const ALL_OPTION = "All years";

function SeasonSelect({
  years,
  selectedYearId,
  onSelect,
}: {
  years: any[];
  selectedYearId: string;
  onSelect: (yearId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const selectedLabel =
    selectedYearId === ALL
      ? ALL_OPTION
      : (() => {
          const y = years.find((yr) => yr.id === selectedYearId);
          return y ? y.label || String(y.year) : "Select season";
        })();

  const q = query.trim().toLowerCase();
  const filteredYears = years.filter((y) =>
    (y.label || String(y.year)).toLowerCase().includes(q),
  );
  const showAllOption = ALL_OPTION.toLowerCase().includes(q);

  function choose(yearId: string) {
    onSelect(yearId);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setQuery(""); setOpen((v) => !v); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 h-9 pl-3.5 pr-2.5 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] text-[13px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors min-w-[160px]"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`ml-auto text-[var(--color-ink-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1.5 w-64 rounded-lg border border-[var(--color-rule)] bg-[var(--color-bg-card)] shadow-[var(--shadow-lifted)] overflow-hidden">
          <div className="flex items-center gap-2 px-3 h-10 border-b border-[var(--color-rule)]">
            <Search size={14} strokeWidth={2} className="text-[var(--color-ink-muted)] shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search seasons…"
              className="w-full bg-transparent text-[13px] focus:outline-none placeholder:text-[var(--color-ink-muted)]"
            />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {showAllOption && (
              <SeasonOption
                label={ALL_OPTION}
                active={selectedYearId === ALL}
                onClick={() => choose(ALL)}
              />
            )}
            {filteredYears.map((y) => (
              <SeasonOption
                key={y.id}
                label={y.label || String(y.year)}
                dot={y.is_active}
                active={selectedYearId === y.id}
                onClick={() => choose(y.id)}
              />
            ))}
            {!showAllOption && filteredYears.length === 0 && (
              <li className="px-3.5 py-3 text-[12.5px] text-[var(--color-ink-muted)]">No seasons match.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function SeasonOption({
  label,
  active,
  dot,
  onClick,
}: {
  label: string;
  active: boolean;
  dot?: boolean;
  onClick: () => void;
}) {
  return (
    <li role="option" aria-selected={active}>
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-2 px-3.5 h-9 text-left text-[13px] transition-colors ${
          active
            ? "bg-[var(--color-bg-soft)] text-[var(--color-ink)] font-medium"
            : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]/60"
        }`}
      >
        {dot && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] shrink-0" />}
        <span className="truncate">{label}</span>
        {active && <Check size={14} strokeWidth={2} className="ml-auto text-[var(--color-accent)] shrink-0" />}
      </button>
    </li>
  );
}

function NewSeasonPanel({
  clubId,
  onClose,
  onCreated,
}: {
  clubId: string;
  onClose: () => void;
  onCreated: (created: any) => void | Promise<void>;
}) {
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [label, setLabel] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const yearNum = parseInt(year, 10);
    if (!Number.isFinite(yearNum)) {
      setError("Enter a valid year.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await apiFetch(`/clubs/${clubId}/years`, {
        method: "POST",
        body: JSON.stringify({
          year: yearNum,
          label: label.trim() || null,
          is_active: isActive,
        }),
      });
      await onCreated(created);
    } catch (err: any) {
      setError(err?.message || "Failed to create season");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="border border-[#fecaca] bg-[var(--color-danger-soft)] text-[var(--color-danger)] rounded-md px-3 py-2 text-[12px]">{error}</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2026"
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL}>Label <span className="text-[var(--color-ink-muted)] font-normal">(optional)</span></label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Summer 2026"
            className={FIELD}
          />
        </div>
      </div>
      <label className="inline-flex items-center gap-2 text-[13px] text-[var(--color-ink)]">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-[var(--color-rule-strong)]" />
        Set as an active season
      </label>
      <ModalActions>
        <button type="button" onClick={onClose} className="h-9 px-3 rounded-md text-[13px] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]">Cancel</button>
        <button type="submit" disabled={saving} className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors">
          {saving ? "Creating…" : "Create season"}
        </button>
      </ModalActions>
    </form>
  );
}

function NewTeamPanel({
  clubId,
  years,
  defaultYearId,
  onClose,
  onCreated,
}: {
  clubId: string;
  years: any[];
  defaultYearId: string;
  onClose: () => void;
  onCreated: (yearId: string) => void | Promise<void>;
}) {
  const [yearId, setYearId] = useState<string>(defaultYearId || years[0]?.id || "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!yearId) {
      setError("Choose a season for this team.");
      return;
    }
    if (!name.trim()) {
      setError("Enter a team name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/clubs/${clubId}/teams`, {
        method: "POST",
        body: JSON.stringify({
          year_id: yearId,
          name: name.trim(),
          description: description.trim() || null,
        }),
      });
      await onCreated(yearId);
    } catch (err: any) {
      setError(err?.message || "Failed to create team");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="border border-[#fecaca] bg-[var(--color-danger-soft)] text-[var(--color-danger)] rounded-md px-3 py-2 text-[12px]">{error}</div>
      )}
      <div>
        <label className={LABEL}>Season</label>
        <select value={yearId} onChange={(e) => setYearId(e.target.value)} className={FIELD}>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label || y.year}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={LABEL}>Team name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. First XI" className={FIELD} autoFocus />
      </div>
      <div>
        <label className={LABEL}>Description <span className="text-[var(--color-ink-muted)] font-normal">(optional)</span></label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="What this team is about…"
          className="w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 py-2 text-[13px] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10"
        />
      </div>
      <ModalActions>
        <button type="button" onClick={onClose} className="h-9 px-3 rounded-md text-[13px] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]">Cancel</button>
        <button type="submit" disabled={saving} className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors">
          {saving ? "Creating…" : "Create team"}
        </button>
      </ModalActions>
    </form>
  );
}
