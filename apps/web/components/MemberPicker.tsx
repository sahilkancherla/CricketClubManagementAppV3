"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/api";

const PAGE_SIZE = 8;

function memberName(m: any): string {
  const p = m.profile || {};
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return name || p.email || "Unknown";
}

/**
 * Searchable, paginated club-member checkbox list. Fetches a page at a time from
 * the server so it scales to thousands of members. Selection is controlled by
 * the parent (a Set of user_ids) and persists across searches and pages.
 */
export function MemberPicker({
  clubId,
  selected,
  onToggle,
}: {
  clubId: string;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Debounce the search box; reset to page 1 on a new query.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setDebounced(search);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (debounced.trim()) qs.set("search", debounced.trim());
    apiFetch(`/clubs/${clubId}/members?${qs.toString()}`)
      .then((d) => {
        if (!active) return;
        setRows(d?.members || []);
        setTotal(d?.total || 0);
      })
      .catch(() => {
        if (!active) return;
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clubId, page, debounced]);

  return (
    <div className="rounded-md border border-[var(--color-rule-strong)] overflow-hidden">
      {/* Search */}
      <div className="relative border-b border-[var(--color-rule)]">
        <Search size={14} strokeWidth={1.9} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members…"
          className="w-full h-9 pl-9 pr-3 text-[13px] bg-[var(--color-bg-card)] focus:outline-none"
        />
      </div>

      {/* Rows */}
      <div className="max-h-56 overflow-y-auto divide-y divide-[var(--color-rule)]">
        {loading ? (
          <p className="px-3 py-2.5 text-[12.5px] text-[var(--color-ink-muted)]">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-3 py-2.5 text-[12.5px] text-[var(--color-ink-muted)]">
            {debounced ? "No members match your search." : "No members found."}
          </p>
        ) : (
          rows.map((m) => (
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
              {m.profile?.is_placeholder && (
                <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium uppercase tracking-wide bg-[var(--color-bg-soft)] text-[var(--color-ink-muted)] border border-[var(--color-rule)]">
                  <UserPlus size={9} strokeWidth={2} />
                  Off-app
                </span>
              )}
            </label>
          ))
        )}
      </div>

      {/* Footer: selected count + pagination */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
        <span className="text-[11.5px] text-[var(--color-ink-soft)] tabular-nums">
          {selected.size} selected{total ? ` · ${total} total` : ""}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-[var(--color-rule)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-faint)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} strokeWidth={2} />
          </button>
          <span className="text-[11.5px] tabular-nums text-[var(--color-ink-soft)] px-1">
            {page}/{totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-[var(--color-rule)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-faint)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
