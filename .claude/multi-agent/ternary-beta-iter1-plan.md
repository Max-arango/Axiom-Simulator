# MAE Iteration 1 — AXIOM Ternary Beta: Engine + Access Layer

Scope chosen by user: **Motor Phase-1 + capa de acceso**. Trust-boundary change →
AppSec + Red Team required. HITL: REQUIRE_APPROVAL (auth + schema).

## Reused (do NOT reinvent) — from existing app map
- Supabase clients: `src/lib/supabase/{client,server,admin}.ts`. `createAdminClient()` = service-role, bypasses RLS, server-only.
- Admin guard pattern: `src/lib/admin/api.ts:60` `requireAdmin()` (checks `profiles.role` server-side) + `ApiError/handleApiError/jsonOk/readJson`. Model the beta guard on it.
- Client auth: `useAuth()` `src/components/auth/auth-provider.tsx:186`.
- RLS admin helper: `public.is_admin()` SECURITY DEFINER (migration 1).
- DEAD, ignore: `src/lib/auth/*` (Prisma), `prisma/*`.

## A. Ternary engine (pure math, `src/lib/ternary/`, zero deps)
- `trit.ts` — Trit, TritVector, TritWord. Internal repr = number (-1|0|1 canonical), system tag for display {balanced|unbalanced}.
- `convert.ts` — decimal↔{0,1,2}, decimal↔{-1,0,+1}, cross-system. Round-trip exact.
- `arith.ts` — add/sub/mul/neg/inc/dec/cmp with balanced normalization (carry in {-1,0,1}).
- `gates.ts` — MIN/MAX/AND/OR/NOT/XOR/XNOR/NAND/NOR/SUM/CARRY/COMPARE. Label AXIOM-defined where non-standard.
- `truth-table.ts` — TernaryFunction(n inputs → m outputs), enumerates 3^n rows.
- `*.test.ts` — exhaustive vitest incl. round-trip over a large range + edge cases (0, negatives, max word).
- **Config**: extend `vitest.config.ts` include glob to also collect `src/lib/ternary/**/*.test.ts` (current glob is simulator-only).

## B. Access layer (one migration + server guards)
Migration `*_ternary_beta.sql`:
1. `profiles.status` text default 'active' check in (active|suspended|revoked).
2. **Close self-escalation (pre-existing + new)**: `revoke update (role, status) on public.profiles from anon, authenticated;` — admin edits go through service-role (bypasses), user self-updates of display_name/bio/avatar still work. Belt+suspenders vs the RLS-row-only `with check`.
3. `ternary_beta_grants` (append-only history): id, user_id, granted_by, reason, note, granted_at, expires_at (null=permanent), revoked_at, revoked_by. Active = revoked_at is null AND (expires_at is null OR expires_at > now()). RLS: user SELECT own; INSERT/UPDATE admin-only (`is_admin()`). No self-write.
4. `feature_flags` (key pk, enabled bool, description, updated_at). Seed TERNARY_BETA=true (+ TERNARY_ALU/CPU/MEMORY/EXPERIMENTS=false as kill-switches). RLS: SELECT all, write admin-only.
5. `admin_audit_log` (id, actor, target, action, metadata jsonb, ip_hash, created_at). RLS: SELECT admin-only; writes server-side via service-role (unforgeable).
6. `public.has_ternary_beta_access(uid uuid default auth.uid())` SECURITY DEFINER: status='active' AND active grant exists AND feature_flags.TERNARY_BETA enabled. For RLS on future ternary_* tables + guard reuse.
7. TS guards `src/lib/ternary-access/`: `requireTernaryBeta()` (server, ApiError 403 with NEUTRAL message §9), page guard = beta OR admin. Client `useTernaryAccess()` for UX hiding. Audit-write helper (service-role).
8. Hand-extend `src/lib/supabase/types.ts` for the new tables + RPC (can't `generate` without live project).

## Deferred (YAGNI now — named, not forgotten)
- Beta groups (§31): grants cover controlled rollout. Add when running >1 cohort.
- Per-user feature overrides (§30): global flag + grant suffices. Add when a flag needs per-user targeting.
- Ternary resource tables (§27: ternary_projects/circuits/…): nothing persists yet (no save UI, no engine serialization this iter). Add with the save feature.
- Admin UI for grants/flags/audit: this iter ships the DB + guards; wiring the admin panel is next iter.
- Rate limiting / simulation cost limits (§33): no simulation endpoint yet. Add with the runtime.

## Gate list (must pass before PD)
- QA: vitest green (engine, incl. round-trip); migration applies clean on bare-PG ladder; RLS self-grant denied.
- AppSec: RLS + guards + neutral error + no secret to client.
- Red Team: self-grant, self-status-unsuspend, self-role-escalate, expired-bypass, direct-URL, revocation-lag — all must fail to break in.
- Evidence attached for each. No PD approval with CRITICAL / unmitigated HIGH.
