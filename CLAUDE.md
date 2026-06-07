# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CricketClub is a full-stack cricket club management platform with:
- **Mobile app**: Cross-platform (React Native / Expo)
- **Web app**: Responsive for desktop and mobile (Next.js)
- **Backend server**: Express.js REST API (`apps/server`)
- **Database**: Supabase (PostgreSQL, Auth, Storage)
- **Payments**: PayPal (stub for MVP)
- **Hosting**: Railway (MVP)

## Architecture

Three-tier: Frontends (mobile + web) → Express API server → Supabase

- Frontends use Supabase Auth client directly for login/register/session management
- All data operations go through the Express REST API at `/api/*`
- Frontends send Supabase JWT in `Authorization: Bearer` header to Express
- Express verifies JWT via Supabase, then enforces role-based access via middleware
- Express uses Supabase service role key (untyped client) — all validation done via Zod middleware

## Repository Structure

npm workspaces monorepo:
- `apps/server` — Express.js API server (`@cricket/server`)
- `apps/web` — Next.js web app (`@cricket/web`)
- `apps/mobile` — Expo/React Native app (`@cricket/mobile`)
- `packages/shared` — Shared types, Zod validators, constants (`@cricket/shared`)
- `supabase/` — Database migrations, config

## Build & Development Commands

```bash
npm install                    # Install all workspace dependencies
npm run build:shared           # Build shared package (must run before server/web)
npm run build:server           # Build Express server
npm run build:web              # Build Next.js web app
npm run build                  # Build all (shared → server → web)

npm run dev:server             # Start Express dev server (tsx watch, port 3001)
npm run dev:web                # Start Next.js dev server (port 3000)
npm run dev:mobile             # Start Expo dev server
```

## Database

Uses Supabase (PostgreSQL). Migrations live in `supabase/migrations/`.
```bash
supabase start                 # Start local Supabase
supabase db reset              # Reset and rerun all migrations
supabase migration new <name>  # Create new migration
```

## Key Domain Concepts

- **Clubs**: Multi-tenant — each club has its own years, teams, games, expenses, and payments
- **Years (Seasons)**: A club operates per year; past years remain viewable for history
- **Members/Roles**: Users belong to clubs with roles: admin, captain, player (can hold multiple). One row per role in `club_member_roles`. Members track join date, active/inactive status, and cricket role details (player_type, batting_hand, bowling_type). Each profile can hold PayPal payout info.
- **Teams**: Created for a given year within a club; members are assigned to a team and captains designated
- **Games**: Belong to a team — opponent, location, date, time. Admins pick a saved selection (playing XI) and can export a WhatsApp message
- **Expenses**: Tracked at club, team, or game level (e.g. ground booking, equipment)
- **Payments**: Admins create a payment and assign it to specific users or all users (QuickBooks-style), with PayPal integration stubbed for P0

## Coding Standards & Patterns

### Naming Conventions
- **Files**: kebab-case (`team-members.ts`)
- **Functions/variables**: camelCase (`createClubSchema`, `requireAuth`)
- **Constants**: UPPER_SNAKE_CASE (`ROLES`, `MEMBER_STATUSES`)
- **Database tables/columns**: snake_case (`club_members`, `team_members`)
- **Route exports**: `{resource}Routes` (`clubRoutes`, `teamRoutes`)
- **Zod schemas**: `create/update{Resource}Schema` → inferred type `Create/Update{Resource}Input`

### Server Route Pattern
All routes follow the same middleware chain:
```typescript
router.post('/path', requireAuth, requireClubRole('admin'), validate(schema), async (req, res, next) => {
  try {
    // handler logic using supabase service role client
  } catch (err) { next(err); }
});
```
- `requireAuth` — verifies JWT, sets `req.user`
- `requireClubRole(...roles)` — checks `club_members` + `club_member_roles` for active role in club
- `validate(schema)` — parses `req.body` against Zod schema from `@cricket/shared`
- Errors thrown as `AppError(statusCode, message)` or caught by `errorHandler` middleware

### Frontend Patterns
- **UI framework**: Tailwind (web: Tailwind v4 CSS vars; mobile: NativeWind v4) — emerald/green design system shared from `packages/shared/src/colors.ts`
- **Icons**: lucide-react (web), @expo/vector-icons Ionicons (mobile)
- **API calls**: Always use `apiFetch()` from `lib/api.ts` — it handles auth headers automatically
- **Auth routing**: Web uses Next.js middleware; mobile uses root layout `onAuthStateChange`
- **Route groups**: `(auth)` for login/register, `(app)` for protected pages

### Shared Package
- Must be rebuilt (`npm run build:shared`) after changes before server/web can see updates
- Built with tsup (ESM + CJS output)

### Stubs (replace for production)
- `apps/server/src/services/paypal.ts` — PayPal operations log to console
- `apps/server/src/services/mail.ts` — Email operations log to console
- `apps/server/src/routes/webhooks.ts` — PayPal webhook endpoint (logs events)

### Environment Variables
- **Server**: `.env` — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`
- **Web**: `.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`
- **Mobile**: `.env` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL`
