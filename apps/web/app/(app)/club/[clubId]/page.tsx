"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CircleDollarSign, Receipt, TrendingDown, Users, Wallet } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useClub } from "./ClubContext";

type Overview = {
  members: any[] | null;
  payments: any[] | null;
  expenses: any[] | null;
  expensesTotal: number | null;
  years: any[] | null;
  teams: number | null;
};

export default function ClubHomePage() {
  const { clubId, club, roles, isAdmin, isCaptain, loading: clubLoading } = useClub();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [members, payments, expenses, years, teams] = await Promise.all([
          apiFetch(`/clubs/${clubId}/members`).catch(() => null),
          apiFetch(`/clubs/${clubId}/payments`).catch(() => null),
          apiFetch(`/clubs/${clubId}/expenses`).catch(() => null),
          apiFetch(`/clubs/${clubId}/years`).catch(() => null),
          apiFetch(`/clubs/${clubId}/teams`).catch(() => null),
        ]);
        if (cancelled) return;
        setData({
          members: Array.isArray(members?.members) ? members.members : null,
          payments: Array.isArray(payments) ? payments : null,
          expenses: Array.isArray(expenses?.expenses) ? expenses.expenses : null,
          expensesTotal: expenses?.total_cents ?? null,
          years: Array.isArray(years) ? years : null,
          teams: Array.isArray(teams) ? teams.length : null,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const members = data?.members ?? [];
  const activeMembers = members.filter((m) => m.status === "active").length;
  const adminCount = members.filter((m) => (m.roles || []).includes("admin")).length;
  const captainCount = members.filter((m) => (m.roles || []).includes("captain")).length;
  const playerCount = members.filter((m) => (m.roles || []).includes("player")).length;

  const payments = data?.payments ?? [];
  const pendingDues = payments.reduce((s, p) => s + (p.outstanding_cents || 0), 0);
  const collected = payments.reduce((s, p) => s + (p.collected_cents || 0), 0);
  const outstanding = payments
    .filter((p) => (p.outstanding_cents || 0) > 0)
    .slice(0, 5);

  const expenses = data?.expenses ?? [];
  const expensesTotal = data?.expensesTotal ?? 0;

  const years = data?.years ?? [];
  const activeSeasons = years.filter((y) => y.is_active);

  // Per-season breakdowns: dues (pending/collected) and expense spend.
  const duesFor = (yearId: string | null) => {
    const ps = payments.filter((p) => (yearId === null ? !p.year_id : p.year_id === yearId));
    return {
      pending: ps.reduce((s, p) => s + (p.outstanding_cents || 0), 0),
      collected: ps.reduce((s, p) => s + (p.collected_cents || 0), 0),
    };
  };
  const expenseFor = (yearId: string | null) =>
    expenses
      .filter((e) => (yearId === null ? !e.year_id : e.year_id === yearId))
      .reduce((s, e) => s + (e.amount_cents || 0), 0);

  const hasNoSeasonDues = payments.some((p) => !p.year_id);
  const hasNoSeasonExpenses = expenses.some((e) => !e.year_id);

  const seasonName = (y: any) => y.label || String(y.year);

  const duesRows: BreakdownRow[] = [
    ...activeSeasons.map((y) => {
      const d = duesFor(y.id);
      return {
        key: y.id,
        label: seasonName(y),
        value: formatCurrency(d.pending),
        sub: `${formatCurrency(d.collected)} collected`,
        accent: d.pending > 0,
      };
    }),
    ...(hasNoSeasonDues
      ? [
          {
            key: "none",
            label: "No season",
            value: formatCurrency(duesFor(null).pending),
            sub: `${formatCurrency(duesFor(null).collected)} collected`,
            accent: duesFor(null).pending > 0,
          },
        ]
      : []),
  ];

  const expenseRows: BreakdownRow[] = [
    ...activeSeasons.map((y) => ({
      key: y.id,
      label: seasonName(y),
      value: formatCurrency(expenseFor(y.id)),
    })),
    ...(hasNoSeasonExpenses
      ? [{ key: "none", label: "No season", value: formatCurrency(expenseFor(null)) }]
      : []),
  ];

  const tiles = [
    {
      label: "Members",
      value: data?.members != null ? String(members.length) : "—",
      sub: data?.members != null ? `${activeMembers} active` : "Not available",
      icon: Users,
      href: isAdmin || isCaptain ? `/club/${clubId}/members` : undefined,
      show: true,
    },
    {
      label: "Pending dues",
      value: data?.payments != null ? formatCurrency(pendingDues) : "—",
      sub: data?.payments != null ? `${formatCurrency(collected)} collected` : "Admins only",
      icon: Wallet,
      href: isAdmin ? `/club/${clubId}/payments` : undefined,
      accent: pendingDues > 0,
      show: isAdmin,
    },
    {
      label: "Expenses",
      value: data?.expensesTotal != null ? formatCurrency(data.expensesTotal) : "—",
      sub: "Total spending",
      icon: Receipt,
      href: isAdmin ? `/club/${clubId}/expenses` : undefined,
      show: isAdmin,
    },
    {
      label: "Teams",
      value: data?.teams != null ? String(data.teams) : "—",
      sub:
        data?.years != null
          ? `${data.years.length} ${data.years.length === 1 ? "season" : "seasons"}`
          : " ",
      icon: CalendarDays,
      href: `/club/${clubId}/teams`,
      show: true,
    },
  ].filter((t) => t.show);

  return (
    <div className="space-y-9">
      <header className="space-y-2">
        <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-[var(--color-accent)]">Overview</p>
        <h1 className="font-display text-[32px] leading-[1.05] font-semibold text-[var(--color-ink)]">
          {clubLoading ? "…" : club?.name ?? "Club"}
        </h1>
        <p className="text-[14px] text-[var(--color-ink-soft)]">
          {roles.length > 0
            ? `You're ${roles.join(", ")} here. Here's how things stand.`
            : "A snapshot of the club at a glance."}
        </p>
      </header>

      {/* Stat tiles */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-lg bg-[var(--color-bg-soft)] ring-1 ring-[var(--color-rule)] flex items-center justify-center">
                  <Icon size={16} strokeWidth={1.85} className="text-[var(--color-ink-soft)]" />
                </span>
                {t.href && (
                  <ArrowUpRight
                    size={14}
                    strokeWidth={1.75}
                    className="text-[var(--color-ink-faint)] group-hover:text-[var(--color-accent)] transition-colors"
                  />
                )}
              </div>
              <div className="mt-4">
                <p
                  className={`font-display text-[26px] leading-none font-semibold tabular-nums ${
                    t.accent ? "text-[var(--color-warn)]" : "text-[var(--color-ink)]"
                  }`}
                >
                  {loading ? <span className="inline-block h-6 w-16 rounded bg-[var(--color-bg-soft)] animate-pulse align-middle" /> : t.value}
                </p>
                <p className="mt-1.5 text-[12px] text-[var(--color-ink-soft)]">{t.label}</p>
                <p className="text-[11.5px] text-[var(--color-ink-muted)]">{t.sub}</p>
              </div>
            </>
          );
          const className =
            "group block border border-[var(--color-rule)] rounded-xl p-4 bg-[var(--color-bg-card)] transition-all duration-200";
          return t.href ? (
            <Link key={t.label} href={t.href} className={`${className} hover:border-[var(--color-ink-faint)] hover:shadow-[var(--shadow-lifted)] no-underline text-[var(--color-ink)]`}>
              {inner}
            </Link>
          ) : (
            <div key={t.label} className={className}>
              {inner}
            </div>
          );
        })}
      </section>

      {/* Season breakdowns */}
      {isAdmin && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <BreakdownCard
            title="Pending dues"
            icon={Wallet}
            href={`/club/${clubId}/payments`}
            allTimeLabel="Pending · all time"
            allTimeValue={data?.payments != null ? formatCurrency(pendingDues) : "—"}
            allTimeSub={data?.payments != null ? `${formatCurrency(collected)} collected` : undefined}
            allTimeAccent={pendingDues > 0}
            rows={duesRows}
            loading={loading}
          />
          <BreakdownCard
            title="Expenses"
            icon={Receipt}
            href={`/club/${clubId}/expenses`}
            allTimeLabel="Spend · all time"
            allTimeValue={data?.expenses != null ? formatCurrency(expensesTotal) : "—"}
            rows={expenseRows}
            loading={loading}
          />
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Outstanding dues */}
        {isAdmin && (
          <section className="lg:col-span-3 border border-[var(--color-rule)] rounded-xl bg-[var(--color-bg-card)] overflow-hidden">
            <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--color-rule)]">
              <h2 className="text-[13px] font-semibold text-[var(--color-ink)] flex items-center gap-2">
                <CircleDollarSign size={15} strokeWidth={1.85} className="text-[var(--color-ink-soft)]" />
                Outstanding dues
              </h2>
              <Link href={`/club/${clubId}/payments`} className="text-[12px] font-medium text-[var(--color-accent)] no-underline hover:underline">
                View all
              </Link>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 rounded-md bg-[var(--color-bg-soft)] animate-pulse" />
                ))}
              </div>
            ) : outstanding.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <TrendingDown size={20} strokeWidth={1.6} className="mx-auto text-[var(--color-ink-faint)] mb-2" />
                <p className="text-[13px] text-[var(--color-ink-soft)]">Nothing outstanding. All dues are settled.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-rule)]">
                {outstanding.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-[var(--color-ink)] truncate">{p.title}</p>
                      <p className="text-[11.5px] text-[var(--color-ink-muted)]">
                        {p.paid_count}/{p.assigned_count} paid
                        {p.due_date ? ` · due ${formatDate(p.due_date)}` : ""}
                      </p>
                    </div>
                    <span className="text-[13.5px] font-semibold tabular-nums text-[var(--color-warn)] shrink-0">
                      {formatCurrency(p.outstanding_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Roster breakdown */}
        <section className={`${isAdmin ? "lg:col-span-2" : "lg:col-span-5"} border border-[var(--color-rule)] rounded-xl bg-[var(--color-bg-card)] overflow-hidden`}>
          <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--color-rule)]">
            <h2 className="text-[13px] font-semibold text-[var(--color-ink)] flex items-center gap-2">
              <Users size={15} strokeWidth={1.85} className="text-[var(--color-ink-soft)]" />
              Roster
            </h2>
            {(isAdmin || isCaptain) && (
              <Link href={`/club/${clubId}/members`} className="text-[12px] font-medium text-[var(--color-accent)] no-underline hover:underline">
                Manage
              </Link>
            )}
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 rounded-md bg-[var(--color-bg-soft)] animate-pulse" />
              ))}
            </div>
          ) : data?.members == null ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-[var(--color-ink-soft)]">Roster isn&apos;t available for your role.</p>
            </div>
          ) : (
            <dl className="divide-y divide-[var(--color-rule)]">
              {[
                { label: "Active members", value: activeMembers },
                { label: "Admins", value: adminCount },
                { label: "Captains", value: captainCount },
                { label: "Players", value: playerCount },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-5 py-3">
                  <dt className="text-[13px] text-[var(--color-ink-soft)]">{row.label}</dt>
                  <dd className="text-[14px] font-semibold tabular-nums text-[var(--color-ink)]">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>
    </div>
  );
}

type BreakdownRow = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
};

function BreakdownCard({
  title,
  icon: Icon,
  href,
  allTimeLabel,
  allTimeValue,
  allTimeSub,
  allTimeAccent,
  rows,
  loading,
}: {
  title: string;
  icon: typeof Wallet;
  href: string;
  allTimeLabel: string;
  allTimeValue: string;
  allTimeSub?: string;
  allTimeAccent?: boolean;
  rows: BreakdownRow[];
  loading: boolean;
}) {
  return (
    <div className="border border-[var(--color-rule)] rounded-xl bg-[var(--color-bg-card)] overflow-hidden">
      <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--color-rule)]">
        <h2 className="text-[13px] font-semibold text-[var(--color-ink)] flex items-center gap-2">
          <Icon size={15} strokeWidth={1.85} className="text-[var(--color-ink-soft)]" />
          {title}
        </h2>
        <Link href={href} className="text-[12px] font-medium text-[var(--color-accent)] no-underline hover:underline">
          View all
        </Link>
      </div>

      {/* All-time headline */}
      <div className="px-5 py-4 border-b border-[var(--color-rule)]">
        <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[var(--color-ink-muted)]">
          {allTimeLabel}
        </p>
        <p
          className={`mt-1 font-display text-[26px] leading-none font-semibold tabular-nums ${
            allTimeAccent ? "text-[var(--color-warn)]" : "text-[var(--color-ink)]"
          }`}
        >
          {loading ? (
            <span className="inline-block h-6 w-20 rounded bg-[var(--color-bg-soft)] animate-pulse align-middle" />
          ) : (
            allTimeValue
          )}
        </p>
        {allTimeSub && !loading && (
          <p className="mt-1 text-[11.5px] text-[var(--color-ink-muted)]">{allTimeSub}</p>
        )}
      </div>

      {/* Per active-season rows */}
      {loading ? (
        <div className="p-5 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-7 rounded-md bg-[var(--color-bg-soft)] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <p className="px-5 pt-3 text-[10.5px] font-medium tracking-[0.1em] uppercase text-[var(--color-ink-muted)]">
            By active season
          </p>
          {rows.length === 0 ? (
            <p className="px-5 py-3 text-[12.5px] text-[var(--color-ink-soft)]">
              No active season.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-rule)]">
              {rows.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[13px] text-[var(--color-ink)] truncate">{row.label}</p>
                    {row.sub && (
                      <p className="text-[11px] text-[var(--color-ink-muted)]">{row.sub}</p>
                    )}
                  </div>
                  <span
                    className={`text-[13.5px] font-semibold tabular-nums shrink-0 ${
                      row.accent ? "text-[var(--color-warn)]" : "text-[var(--color-ink)]"
                    }`}
                  >
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
