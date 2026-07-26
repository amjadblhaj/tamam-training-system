# تمام (Tamam) — Multi-Tenant Loyalty Points Platform

## Stack

Next.js 14 (App Router) · TypeScript · Supabase (Postgres) · Tailwind CSS · TanStack Query

## Setup

1. Copy `.env.example` to `.env.local` and fill in the values (see comments in that file for where to get each one).
2. `npm install`
3. Run every file in `supabase/migrations/`, in filename order (`001_...` through `009_...`), in your Supabase project's SQL Editor.
4. `npm run dev`

## Architecture

- `app/` — routes (Next.js App Router). `app/(admin)/*` is the tenant staff/admin panel, `app/portal/*` is the student portal, `app/super-admin/*` is the separate Super Admin panel, `app/register/[token]` and `app/leaderboard/*` are public (no login) pages.
- `components/` — UI components grouped by domain (`students/`, `branches/`, `super-admin/`, etc.) plus `components/ui/` for the handful of truly shared primitives (`Input`, `SubmitButton`).
- `hooks/` — client-side data fetching and shared state (`useReadOnly`, `useStudents`, `useCopyToClipboard`, etc.).
- `lib/auth/` — session creation/verification for both the tenant panel and the separate Super Admin panel, password hashing, and login rate limiting.
- `lib/tenant/` — tenant access control (`access.ts`) and status resolution/auto-expiry (`resolve-status.ts`) — the read-only mode logic.
- `lib/supabase/` — the Supabase client (`server.ts`) and a small helper (`relation.ts`) for reading nested-relation joins.
- `lib/constants.ts` — shared constants (bcrypt cost, page sizes, rate-limit scopes, timeouts).
- `types/` — TypeScript interfaces for every domain model and action result. See [Database](#database) for why these aren't generated from the schema (yet).
- Data access itself (Supabase queries) is *not* centralized into a separate query layer — it lives in each route's colocated `actions.ts` (Server Actions), which is the pattern this codebase has used consistently throughout. See `ARCHITECTURE.md` if you're considering introducing a `lib/supabase/queries/` layer.

## Key concepts

### Multi-tenancy

Every tenant-owned table has a `tenant_id` column. Every query in every server action filters by `session.tenantId` (never a client-supplied tenant id). See `ARCHITECTURE.md` for the full isolation model, including why the Supabase client here uses the `service_role` key (bypassing RLS) rather than RLS as the primary isolation mechanism.

### Read-only mode

`tenant.status` controls access:

- `trial` / `active` → full access
- `suspended` / `expired` → read-only; all write buttons hidden client-side, and every write-side server action independently re-checks via `assertTenantCanWrite()` server-side

Use the `useReadOnly()` hook in any component that renders a write action (button, form). See `ARCHITECTURE.md` for why this is enforced at write-time rather than in `middleware.ts`.

### Two independent auth systems

The tenant panel/portal (`lib/auth/session.ts`, cookie `tamam_session`) and the Super Admin panel (`lib/auth/super-admin-session.ts`, cookie `mazaya_sa_session`) are completely separate — different cookies, different session payload shapes, never cross-checked. `middleware.ts` branches on the URL prefix (`/super-admin/*` vs. everything else) to apply the right one.

### Student auth

Students log in with phone number only (no password) — see `ARCHITECTURE.md` for the tradeoff this represents and why it was chosen.

## Environment variables

See `.env.example` for the full list, each with a comment explaining what it is and where to get it.

## Database

Run every file in `supabase/migrations/` in order (each is idempotent — safe to re-run):

1. `001_schema.sql` — base schema (students, staff, branches, rewards, points_log, redemptions).
2. `002_fix_grants.sql` — default schema grants (superseded in part by `008`, kept for history).
3. `003_grant_points_function.sql` — the original (pre-multi-tenant) `grant_points` RPC.
4. `004_mazaya_tenant_upgrade.sql` — multi-tenant layer (`tenant_id` everywhere, `tenants` table, RLS, `tenant_stats` view, tenant-scoped RPCs).
5. `005_fix_tenant_stats_view.sql` — adds `created_at` to the `tenant_stats` view.
6. `006_student_self_service_upgrade.sql` — student self-registration (`students.email`, `branches.registration_token`).
7. `007_leaderboard_links_upgrade.sql` — public leaderboard links (`branches.leaderboard_token`, `tenants.leaderboard_token`).
8. `008_security_hardening_upgrade.sql` — revokes the `anon`/`authenticated` over-grants from `002`/`004`/`005`, fixes `students.phone` to be unique per tenant instead of platform-wide, adds a phone-format `CHECK`, adds `audit_log`.
9. `009_sessions_upgrade.sql` — server-side revocable sessions (`sessions` table).

There's no `npx supabase start` local dev setup configured for this project — development runs directly against the hosted Supabase project referenced in `.env.local`.

### Backup and restore

This repo doesn't configure backups itself — that's a Supabase project setting, not application code:

- Enable **Point-in-Time Recovery** (Supabase dashboard → Database → Backups) if your plan supports it. This is the recommended approach — it lets you restore to any point within the retention window, not just daily snapshot boundaries.
- If PITR isn't available on your plan, schedule a daily `pg_dump` against the project's connection string (Database → Connection string in the dashboard) via cron/GitHub Actions/etc., and store the dump somewhere durable (e.g. S3) with a retention policy.
- **Test the restore path at least once before relying on it** — restore into a scratch Supabase project (or local Postgres) and confirm the app can point at it and boot. A backup that's never been restored is unverified.
- Multi-tenant blast radius: a bad restore affects every tenant on the platform at once, not just one. Consider whether per-tenant export/restore (via `pg_dump --table` filtered by `tenant_id`, or application-level export) is worth building if a single tenant ever needs point-in-time recovery without affecting everyone else.

### Generated types

`types/index.ts` is hand-written, not generated from the schema. To generate proper Supabase types instead:

```bash
npx supabase login
npx supabase gen types typescript --project-id <your-project-ref> > types/supabase.ts
```

This needs an authenticated Supabase CLI session (`supabase login`) or `SUPABASE_ACCESS_TOKEN` — neither is available in this repo's environment, so this hasn't been run. Once generated, `lib/supabase/relation.ts`'s cast helper becomes unnecessary for new code (though existing call sites can keep using it).

## Code quality tooling

- `npm run build` — production build; fails on type errors.
- `npx tsc --noEmit` — type-check only.
- `npx next lint` — ESLint (`next/core-web-vitals`, `next/typescript`, plus stricter rules in `.eslintrc.json`: no `any`, no unused vars, no stray `console.log`).
- `npx prettier --write .` — formatting (see `.prettierrc`; double quotes and a 110-char width to match this codebase's existing style, not Prettier's defaults).
