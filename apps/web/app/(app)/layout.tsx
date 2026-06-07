"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { APP_NAME } from "@cricket/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = (email?.[0] ?? "C").toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-base)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-rule)] bg-[var(--color-bg-base)]/85 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 h-16 flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 no-underline shrink-0">
            <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-accent-rich)] to-[var(--color-accent-deep)] text-white shadow-[0_1px_2px_-1px_rgba(4,120,87,0.4)]">
              <span className="text-[13px] font-semibold tracking-tight">{APP_NAME.charAt(0)}</span>
              <span className="absolute -right-0.5 -bottom-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent-leaf)] ring-2 ring-[var(--color-bg-base)]" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)] font-display">{APP_NAME}</span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-full border border-[var(--color-rule)] bg-[var(--color-bg-card)] hover:border-[var(--color-rule-strong)] transition-colors"
                aria-label="Account menu"
              >
                <span className="h-7 w-7 rounded-full bg-gradient-to-br from-[var(--color-accent-rich)] to-[var(--color-accent-deep)] text-white flex items-center justify-center text-[11.5px] font-semibold">
                  {initials}
                </span>
                <ChevronDown size={13} strokeWidth={1.9} className={`text-[var(--color-ink-muted)] transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-60 rounded-lg border border-[var(--color-rule)] bg-[var(--color-bg-card)] shadow-[var(--shadow-lifted)] overflow-hidden">
                  <div className="px-3.5 py-3 border-b border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
                    <p className="text-[12.5px] font-medium text-[var(--color-ink)] truncate">{email ?? "Signed in"}</p>
                    <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">Account</p>
                  </div>
                  <div className="py-1">
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3.5 h-9 text-[13px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] no-underline">
                      <UserRound size={14} strokeWidth={1.75} />
                      Profile
                    </Link>
                    <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-3.5 h-9 text-[13px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] text-left">
                      <LogOut size={14} strokeWidth={1.75} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[1400px] px-6 md:px-10 py-8 md:py-10">
        {children}
      </main>
    </div>
  );
}
