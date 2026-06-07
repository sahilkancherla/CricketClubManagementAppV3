"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChevronLeft, LayoutGrid, Receipt, Users, Wallet } from "lucide-react";
import { useClub } from "./ClubContext";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Users;
  show: boolean;
  exact?: boolean;
};

export function ClubSidebar() {
  const { clubId, club, roles, isAdmin, isCaptain, loading } = useClub();
  const pathname = usePathname();

  const items: NavItem[] = [
    { label: "Overview", href: `/club/${clubId}`, icon: LayoutGrid, show: true, exact: true },
    { label: "Members", href: `/club/${clubId}/members`, icon: Users, show: isAdmin || isCaptain },
    { label: "Seasons & Teams", href: `/club/${clubId}/teams`, icon: CalendarDays, show: true },
    { label: "Expenses", href: `/club/${clubId}/expenses`, icon: Receipt, show: isAdmin },
    { label: "Payments", href: `/club/${clubId}/payments`, icon: Wallet, show: isAdmin },
  ];

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <aside className="hidden md:block w-52 lg:w-56 shrink-0">
      <div className="sticky top-24 space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)] no-underline"
        >
          <ChevronLeft size={13} strokeWidth={2} />
          All clubs
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-soft)] ring-1 ring-[var(--color-rule)] flex items-center justify-center overflow-hidden shrink-0">
            {club?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={club.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[14px] font-semibold text-[var(--color-ink-soft)]">
                {club?.name?.[0]?.toUpperCase() ?? "·"}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold leading-tight text-[var(--color-ink)] truncate">
              {loading ? "Loading…" : club?.name ?? "Club"}
            </p>
            {roles.length > 0 && (
              <p className="text-[11px] capitalize text-[var(--color-ink-muted)] truncate">
                {roles.join(" · ")}
              </p>
            )}
          </div>
        </div>

        <nav className="flex flex-col gap-0.5">
          {items
            .filter((i) => i.show)
            .map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-2.5 h-9 px-2.5 rounded-md text-[13px] no-underline transition-colors ${
                    active
                      ? "bg-[var(--color-bg-soft)] text-[var(--color-ink)] font-medium"
                      : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]/60"
                  }`}
                >
                  <Icon
                    size={16}
                    strokeWidth={1.85}
                    className={active ? "text-[var(--color-accent)]" : "text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink-soft)]"}
                  />
                  {item.label}
                </Link>
              );
            })}
        </nav>
      </div>
    </aside>
  );
}
