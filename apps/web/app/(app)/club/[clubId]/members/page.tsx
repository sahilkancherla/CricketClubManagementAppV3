"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Inbox, Lock, Plus, Search, UserPlus, Users, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";
import { Modal, ModalActions } from "@/components/Modal";
import { formatCurrency, formatDate, todayIso } from "@/lib/utils";
import {
  ROLES,
  MEMBER_STATUSES,
  PLAYER_TYPES,
  BATTING_HANDS,
  BOWLING_TYPES,
  PLAYER_TYPE_LABELS,
  BATTING_HAND_LABELS,
  BOWLING_TYPE_LABELS,
} from "@cricket/shared";

const FIELD =
  "w-full h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13px] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10";
const LABEL = "block text-[12px] font-medium text-[var(--color-ink)] mb-1.5";
const PAGE_SIZE = 10;

export default function MembersPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const [roles, setRoles] = useState<string[]>([]);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<"members" | "requests">("members");
  const [requests, setRequests] = useState<any[]>([]);

  const isAdmin = roles.includes("admin");
  const isCaptain = roles.includes("captain");
  const hasAccess = isAdmin || isCaptain;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadRequests = useCallback(async () => {
    try {
      const data = await apiFetch(`/clubs/${clubId}/join-requests`);
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
    }
  }, [clubId]);

  const loadMembers = useCallback(async () => {
    setListLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (debouncedSearch.trim()) qs.set("search", debouncedSearch.trim());
      const data = await apiFetch(`/clubs/${clubId}/members?${qs.toString()}`);
      setMembers(data?.members || []);
      setTotal(data?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setListLoading(false);
    }
  }, [clubId, page, debouncedSearch]);

  // Debounce the search box and reset to page 1 on a new query.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    (async () => {
      try {
        const myClubs = await apiFetch("/clubs").catch(() => []);
        const entry = (myClubs || []).find((c: any) => c.club_id === clubId);
        const r = entry?.roles || [];
        setRoles(r);
        setAccessLoaded(true);
      } catch (err) {
        console.error(err);
        setAccessLoaded(true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  useEffect(() => {
    if (hasAccess) loadMembers();
  }, [hasAccess, loadMembers]);

  useEffect(() => {
    if (isAdmin) loadRequests();
  }, [isAdmin, loadRequests]);

  if (loading || !accessLoaded) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-48 rounded bg-[var(--color-bg-soft)] animate-pulse" />
        <div className="h-64 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] animate-pulse" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-lg mx-auto">
        <BackButton href={`/club/${clubId}`} label="Back to club" />
        <div className="mt-10 border border-dashed border-[var(--color-rule-strong)] rounded-xl bg-[var(--color-bg-sunken)] p-14 flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-rule)] flex items-center justify-center mb-4 shadow-[var(--shadow-soft)]">
            <Lock size={18} strokeWidth={1.6} className="text-[var(--color-ink-soft)]" />
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)] mb-1">You don&apos;t have access</h3>
          <p className="text-[13px] text-[var(--color-ink-soft)] max-w-xs">
            Only club admins and captains can view the member roster.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <BackButton href={`/club/${clubId}`} label="Back to club" />
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] font-semibold text-[var(--color-ink)]">Members</h1>
            <p className="mt-1 text-[13.5px] text-[var(--color-ink-soft)]">
              {isAdmin ? "Manage roles, status, and player details." : "View the club roster."}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] transition-colors shadow-[var(--shadow-soft)]"
            >
              <Plus size={14} strokeWidth={2.25} />
              Add member
            </button>
          )}
        </div>
      </header>

      {isAdmin && (
        <Modal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          eyebrow="New member"
          title="Add a member"
          description="Add anyone — they don't need an account. Provide an email to invite them to the app."
          size="lg"
        >
          <AddMemberPanel
            clubId={clubId}
            onClose={() => setShowAdd(false)}
            onAdded={async () => {
              setShowAdd(false);
              setPage(1);
              await loadMembers();
            }}
          />
        </Modal>
      )}

      {isAdmin && <MemberTabBar active={tab} onChange={setTab} requestCount={requests.length} />}

      {tab === "members" && (
      <>
      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} strokeWidth={1.9} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className={`${FIELD} pl-9`}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] overflow-hidden">
        {members.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-10 w-10 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center mb-3">
              <Users size={16} strokeWidth={1.75} className="text-[var(--color-ink-muted)]" />
            </div>
            <p className="text-[13px] text-[var(--color-ink-soft)]">
              {debouncedSearch ? "No members match your search." : "No members yet."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
                <Th>Name</Th>
                <Th className="hidden md:table-cell">Email</Th>
                <Th>Roles</Th>
                <Th>Status</Th>
                <Th className="text-right">Balance</Th>
                <Th className="hidden sm:table-cell">Type</Th>
                <Th className="hidden lg:table-cell">Joined</Th>
              </tr>
            </thead>
            <tbody className={listLoading ? "opacity-50 transition-opacity" : "transition-opacity"}>
              {members.map((m) => (
                <MemberRow key={m.id} member={m} clubId={clubId} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-[12.5px] text-[var(--color-ink-soft)]">
          <span>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-1.5">
            <PageButton disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft size={15} strokeWidth={2} />
            </PageButton>
            <span className="px-2 tabular-nums">
              Page {page} / {totalPages}
            </span>
            <PageButton disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              <ChevronRight size={15} strokeWidth={2} />
            </PageButton>
          </div>
        </div>
      )}
      </>
      )}

      {tab === "requests" && isAdmin && (
        <RequestsSection
          clubId={clubId}
          requests={requests}
          onChanged={async () => {
            await Promise.all([loadRequests(), loadMembers()]);
          }}
        />
      )}
    </div>
  );
}

function MemberTabBar({
  active,
  onChange,
  requestCount,
}: {
  active: "members" | "requests";
  onChange: (t: "members" | "requests") => void;
  requestCount: number;
}) {
  const tabs = [
    { id: "members" as const, label: "Members", icon: Users },
    { id: "requests" as const, label: "Requests", icon: Inbox },
  ];
  return (
    <div className="border-b border-[var(--color-rule)]">
      <nav className="-mb-px flex gap-1">
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
              {t.id === "requests" && requestCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-semibold bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] tabular-nums">
                  {requestCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function RequestsSection({
  clubId,
  requests,
  onChanged,
}: {
  clubId: string;
  requests: any[];
  onChanged: () => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(requestId: string, action: "approve" | "reject") {
    setBusyId(requestId);
    try {
      await apiFetch(`/clubs/${clubId}/join-requests/${requestId}/${action}`, { method: "POST" });
      await onChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-rule-strong)] bg-[var(--color-bg-sunken)] p-12 flex flex-col items-center text-center">
        <div className="h-10 w-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-rule)] flex items-center justify-center mb-3">
          <Inbox size={18} strokeWidth={1.6} className="text-[var(--color-ink-soft)]" />
        </div>
        <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">No pending requests</h3>
        <p className="mt-1 text-[12.5px] text-[var(--color-ink-soft)]">Requests to join this club will appear here.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {requests.map((r) => {
        const profile = r.profile || {};
        const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email || "Unknown";
        const detail = [
          r.player_type ? PLAYER_TYPE_LABELS[r.player_type as keyof typeof PLAYER_TYPE_LABELS] : null,
          r.batting_hand ? BATTING_HAND_LABELS[r.batting_hand as keyof typeof BATTING_HAND_LABELS] : null,
          r.bowling_type ? BOWLING_TYPE_LABELS[r.bowling_type as keyof typeof BOWLING_TYPE_LABELS] : null,
        ].filter(Boolean).join(" · ");
        const busy = busyId === r.id;
        return (
          <li
            key={r.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-3.5"
          >
            <div className="w-9 h-9 rounded-full bg-[var(--color-bg-soft)] ring-1 ring-[var(--color-rule)] flex items-center justify-center overflow-hidden shrink-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[11px] font-semibold text-[var(--color-ink-soft)]">
                  {(profile.first_name?.[0] || profile.email?.[0] || "?").toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-medium text-[var(--color-ink)] truncate">{name}</div>
              <div className="text-[11.5px] text-[var(--color-ink-muted)] truncate">
                {profile.email || "—"}
                {detail ? ` · ${detail}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => act(r.id, "approve")}
                disabled={busy}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[12.5px] font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
              >
                <Check size={14} strokeWidth={2.2} />
                Approve
              </button>
              <button
                type="button"
                onClick={() => act(r.id, "reject")}
                disabled={busy}
                aria-label="Reject request"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] disabled:opacity-60 transition-colors"
              >
                <X size={15} strokeWidth={2} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-muted)] ${className}`}>
      {children}
    </th>
  );
}

function PageButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8 rounded-md border border-[var(--color-rule)] flex items-center justify-center text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-faint)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

// Signed balance: negative (red) means the member owes the club; positive
// (green) means they're in credit; zero shows a dash.
function BalanceAmount({ cents }: { cents: number }) {
  if (!cents) {
    return <span className="text-[12.5px] tabular-nums text-[var(--color-ink-muted)]">—</span>;
  }
  const owes = cents < 0;
  return (
    <span
      title={owes ? "Owes the club" : "In credit"}
      className={`text-[12.5px] font-semibold tabular-nums ${owes ? "text-[var(--color-danger)]" : "text-[var(--color-accent-ink)]"}`}
    >
      {formatCurrency(cents)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-medium border ${
        active
          ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-[var(--color-rule)]"
          : "bg-[var(--color-bg-soft)] text-[var(--color-ink-muted)] border-[var(--color-rule)]"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[var(--color-accent)]" : "bg-[var(--color-ink-faint)]"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function MemberRow({ member, clubId }: { member: any; clubId: string }) {
  const profile = member.profile || {};
  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
  const display = fullName || profile.email || "Unnamed member";
  const memberRoles: string[] = member.roles || [];

  return (
    <tr className="border-b border-[var(--color-rule)] last:border-0 hover:bg-[var(--color-bg-soft)] transition-colors group">
      <td className="px-4 py-3">
        <Link href={`/club/${clubId}/members/${member.id}`} className="flex items-center gap-3 no-underline">
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
              <span className="text-[13.5px] font-medium text-[var(--color-ink)] group-hover:text-[var(--color-accent-ink)] truncate">
                {display}
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
        </Link>
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-[12.5px] text-[var(--color-ink-soft)]">{profile.email || "—"}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {memberRoles.length > 0 ? (
            memberRoles.map((r) => (
              <span
                key={r}
                className="inline-flex items-center px-1.5 h-5 rounded-full text-[10px] font-medium capitalize bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)] border border-[var(--color-rule)]"
              >
                {r}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-[var(--color-ink-muted)]">—</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3"><StatusBadge status={member.status} /></td>
      <td className="px-4 py-3 text-right">
        <BalanceAmount cents={member.balance_cents ?? 0} />
      </td>
      <td className="px-4 py-3 hidden sm:table-cell text-[12.5px] text-[var(--color-ink-soft)]">
        {member.player_type ? PLAYER_TYPE_LABELS[member.player_type as keyof typeof PLAYER_TYPE_LABELS] : "—"}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-[12.5px] text-[var(--color-ink-soft)]">
        {member.join_date ? formatDate(member.join_date) : "—"}
      </td>
    </tr>
  );
}

function DetailSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
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

function AddMemberPanel({
  clubId,
  onClose,
  onAdded,
}: {
  clubId: string;
  onClose: () => void;
  onAdded: () => void | Promise<void>;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState(false);
  const [memberRoles, setMemberRoles] = useState<string[]>(["player"]);
  const [status, setStatus] = useState<string>("active");
  const [joinDate, setJoinDate] = useState<string>(todayIso());
  const [playerType, setPlayerType] = useState<string>("");
  const [battingHand, setBattingHand] = useState<string>("");
  const [bowlingType, setBowlingType] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleRole(r: string) {
    setMemberRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  const canSubmit = (firstName.trim() || email.trim()) && memberRoles.length > 0 && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/clubs/${clubId}/members`, {
        method: "POST",
        body: JSON.stringify({
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          email: email.trim() ? email.trim().toLowerCase() : undefined,
          invite: email.trim() ? invite : undefined,
          roles: memberRoles,
          status,
          join_date: joinDate || null,
          player_type: playerType || null,
          batting_hand: battingHand || null,
          bowling_type: bowlingType || null,
        }),
      });
      await onAdded();
    } catch (err: any) {
      setError(err?.message || "Failed to add member");
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
          <label className={LABEL}>First name</label>
          <input autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ravi" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Last name <span className="text-[var(--color-ink-muted)] font-normal">(optional)</span></label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Sharma" className={FIELD} />
        </div>
      </div>

      <div>
        <label className={LABEL}>Email <span className="text-[var(--color-ink-muted)] font-normal">(optional)</span></label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="player@example.com"
          className={FIELD}
        />
        {email.trim() && (
          <label className="mt-2 flex items-center gap-2 text-[12.5px] text-[var(--color-ink-soft)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={invite}
              onChange={(e) => setInvite(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[var(--color-rule-strong)] accent-[var(--color-accent)]"
            />
            Send them an invite to join the app
          </label>
        )}
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
                onClick={() => toggleRole(r)}
                aria-pressed={active}
                className={`h-8 px-3.5 rounded-full text-[12.5px] font-medium capitalize border transition-colors ${
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
            {MEMBER_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Join date</label>
          <input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} className={FIELD} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DetailSelect
          label="Player type"
          value={playerType}
          onChange={setPlayerType}
          options={PLAYER_TYPES.map((v) => ({ value: v, label: PLAYER_TYPE_LABELS[v] }))}
        />
        <DetailSelect
          label="Batting hand"
          value={battingHand}
          onChange={setBattingHand}
          options={BATTING_HANDS.map((v) => ({ value: v, label: BATTING_HAND_LABELS[v] }))}
        />
        <DetailSelect
          label="Bowling type"
          value={bowlingType}
          onChange={setBowlingType}
          options={BOWLING_TYPES.map((v) => ({ value: v, label: BOWLING_TYPE_LABELS[v] }))}
        />
      </div>

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
          {saving ? "Adding…" : "Add member"}
        </button>
      </ModalActions>
    </form>
  );
}
