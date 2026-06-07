import Link from "next/link";
import { APP_NAME } from "@cricket/shared";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-[var(--color-bg-base)] text-[var(--color-ink)]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--color-bg-base)]/85 backdrop-blur border-b border-[var(--color-rule)]">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
            <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-accent-rich)] to-[var(--color-accent-deep)] text-white shadow-[0_1px_2px_-1px_rgba(4,120,87,0.4)]">
              <span className="text-[13px] font-semibold tracking-tight">{APP_NAME.charAt(0)}</span>
              <span className="absolute -right-0.5 -bottom-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent-leaf)] ring-2 ring-[var(--color-bg-base)]" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)] font-display">{APP_NAME}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[13px] text-[var(--color-ink-soft)]">
            <a href="#features" className="hover:text-[var(--color-ink)] transition-colors no-underline">Features</a>
            <a href="#workflow" className="hover:text-[var(--color-ink)] transition-colors no-underline">How it works</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="inline-flex items-center justify-center h-9 px-4 rounded-md text-[13px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors no-underline">Sign In</Link>
            <Link href="/register" className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-[var(--color-accent)] text-[13px] font-medium text-white hover:bg-[var(--color-accent-rich)] transition-colors no-underline">Register</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--color-rule)]">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 0%, rgba(4,120,87,0.06), transparent 40%), radial-gradient(circle at 80% 20%, rgba(16,185,129,0.06), transparent 40%)",
          }}
        />
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-24 md:py-32 flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-rule)] bg-[var(--color-bg-card)] text-[11px] font-medium text-[var(--color-ink-soft)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-bright)]" />
            Built for cricket clubs
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight max-w-4xl leading-[1.05]">
            Run your club.
            <br />
            <span className="text-[var(--color-ink-muted)]">Not your group chat.</span>
          </h1>
          <p className="mt-6 text-[15px] md:text-lg text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
            {APP_NAME} gives club admins, captains, and players a single platform for members, teams, fixtures, selections, expenses, and payments — season after season.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link href="/register" className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[var(--color-accent)] text-[14px] font-medium text-white hover:bg-[var(--color-accent-rich)] transition-colors no-underline shadow-[var(--shadow-soft)]">
              Get started — it&apos;s free
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] text-[14px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors no-underline">
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-[12px] text-[var(--color-ink-muted)]">No credit card required · Set up your club in under 5 minutes</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-[var(--color-rule)]">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-[0.14em]">Everything in one place</p>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight">The operating system for your cricket club.</h2>
            <p className="mt-5 text-[15px] text-[var(--color-ink-soft)] leading-relaxed">
              Stop stitching together spreadsheets and WhatsApp. {APP_NAME} handles seasons, squads, fixtures, and finances — so you can focus on the cricket.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Members & roles", desc: "Admins, captains, and players — one person can be all three. Track join dates, status, and cricket role details." },
              { title: "Seasons & teams", desc: "Create a year, build teams within it, assign players, and name your captains. Past seasons stay one click away." },
              { title: "Fixtures & selection", desc: "Log games with opponent, ground, date and time. Pick your XI, save it, and export a WhatsApp message in one tap." },
              { title: "Expense tracking", desc: "Track spend at club, team, or game level — ground bookings, kit, umpires — with a clear running total." },
              { title: "Payments", desc: "Create a charge and assign it to everyone or a few. QuickBooks-style ledger with PayPal on the roadmap." },
              { title: "Mobile + web", desc: "A native app for players, a polished dashboard for admins. Both powered by the same API." },
            ].map((feature) => (
              <div key={feature.title} className="group p-6 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] hover:border-[var(--color-accent-rule-strong)] hover:shadow-[var(--shadow-lifted)] transition-all">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-soft)] group-hover:bg-[var(--color-accent)] transition-colors flex items-center justify-center mb-4">
                  <div className="w-4 h-4 rounded-sm bg-[var(--color-accent)] group-hover:bg-white transition-colors" />
                </div>
                <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{feature.title}</h3>
                <p className="mt-2 text-[13px] text-[var(--color-ink-soft)] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="border-b border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-[0.14em]">How it works</p>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight">From zero to first fixture in minutes.</h2>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Create your club", desc: "Sign up, name your club, and invite admins and captains. You become the first admin." },
              { step: "02", title: "Set up the season", desc: "Add a year, build your teams, assign players, and pick your captains." },
              { step: "03", title: "Play the season", desc: "Add fixtures, save your selections, track expenses, and collect payments." },
            ].map((s) => (
              <div key={s.step} className="relative p-8 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-rule)]">
                <div className="text-[13px] font-mono font-semibold text-[var(--color-accent)]">{s.step}</div>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--color-ink)]">{s.title}</h3>
                <p className="mt-2 text-[13px] text-[var(--color-ink-soft)] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-[var(--color-rule)]">
        <div className="mx-auto max-w-5xl px-6 md:px-10 py-24 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Ready to run your club better?</h2>
          <p className="mt-5 text-[15px] text-[var(--color-ink-soft)] max-w-xl mx-auto">Join clubs who&apos;ve ditched the spreadsheets.</p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[var(--color-accent)] text-[14px] font-medium text-white hover:bg-[var(--color-accent-rich)] transition-colors no-underline">Create your club</Link>
            <Link href="/login" className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] text-[14px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors no-underline">Sign in</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-bg-base)]">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-accent-rich)] to-[var(--color-accent-deep)] text-white">
              <span className="text-[10px] font-semibold">{APP_NAME.charAt(0)}</span>
            </span>
            <span className="text-[13px] font-semibold text-[var(--color-ink)]">{APP_NAME}</span>
            <span className="text-[12px] text-[var(--color-ink-muted)]">&copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
