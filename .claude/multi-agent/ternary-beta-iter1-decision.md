# MAE Iteration 1 — Production Decision: AXIOM Ternary Beta (Engine + Access Layer)

**Decision: TERMINATE iteration — Proposed Production Decision = APPROVE (merge-ready), 0 blockers.**
Gate rule satisfied: no CRITICAL, no unmitigated HIGH. Deploy-to-live + commit remain HITL (auth/schema change).

## Evidence (all first-hand or agent-run against real Postgres — no self-reports trusted)

### Engine (`src/lib/ternary/`) — GREEN
- `npx vitest run src/lib/ternary` → **53/53 pass** (verified first-hand by orchestrator): balanced round-trip −1000..1000, unbalanced 0..2000, cross-system value-preserving, native arithmetic vs decimal oracle (add/sub/mul/compare), WIDEN overflow, full gate truth tables.
- tsc: zero errors reference new symbols. Minor: 3× TS2554 in engine tests (unary NOT typed as binary in the gate type-model) — cosmetic, runtime-correct. Follow-up.

### Access layer — GREEN (26/26 security assertions PASS, exit 0)
Harness `supabase/tests/security_fence_test.sh` on real PG16.2, 4 migrations applied UNMODIFIED, Supabase-faithful role model:
- **rt-1 CRITICAL (self-escalate via DELETE+re-INSERT on profiles) — FIXED & VERIFIED DENIED.** Fix: `revoke insert, delete on profiles from anon, authenticated` + hardened `profiles_insert` with-check (role='user', status='active'). UPDATE role/status also denied (table-level revoke + safe-column grant). Legit self-edit (display_name) preserved. Signup (handle_new_user) intact.
- **rt-2 (anon RPC enumeration) — FIXED & VERIFIED DENIED.** Fix: `revoke execute … from public, anon` (the explicit anon default-priv grant, not just PUBLIC).
- Predicate truth table correct: no-grant/expired/expiry=now/revoked/suspended/flag-off → false; active+flag-on → true.
- Self-grant, forge-audit, flip-flag by authenticated → all DENIED.
- AppSec: PASS, no CRITICAL/HIGH — guard fail-closed, neutral 403, service-role key non-`NEXT_PUBLIC` (no client leak), audit unforgeable, SECURITY DEFINER search_path pinned.

## Findings resolved this iteration
| id | sev | status |
|----|-----|--------|
| rt-1 self-escalation | CRITICAL | FIXED, verified |
| rt-2 anon RPC enum | MEDIUM | FIXED, verified |
| qa-2/qa-3 harness oracle bugs | LOW | FIXED (test now correct) |
| rt-3 kill-switch admin exemption | LOW | Documented as intentional in guard.ts |

## Non-blocking follow-ups (named, not forgotten)
- **as-1** (MEDIUM def-in-depth): add `import "server-only"` to admin/audit/guard — requires `pnpm add server-only` first (bare specifier doesn't resolve via node/tsc). Real risk (secret leak) already absent.
- **rt-2 residual** (MEDIUM, PRE-EXISTING): `profiles.role`/`status` world-readable via `profiles_select using(true)`. Recommend a public-safe view exposing role/status only to owner/admin. Touches existing reads → own change.
- **as-4/as-5** (LOW): best-effort audit write; status column inherits public read.
- Engine TS2554 type-model cleanup (unary vs binary gate signatures).
- Deferred by scope (unchanged): beta groups, per-user flag overrides, ternary resource/save tables, admin UI wiring, sim rate-limits.

## ⚠ Commit scope warning
Working tree contains UNRELATED, not-mine changes: `package.json`, `package-lock.json`, and a quantum simulator (`src/simulator/quantum/`, `components/quantum/`, `App.tsx`, `HomeView.tsx`, `store.ts`, `mathSearch.ts`). Any commit of this iteration MUST be scoped to ONLY: `src/lib/ternary/`, `src/lib/ternary-access/`, `supabase/migrations/20260914120000_ternary_beta.sql`, `supabase/tests/`, `vitest.config.ts`, `src/lib/supabase/types.ts`.

## HITL gate (pending user)
1. Deploy migration to live Supabase project (auth/schema — irreversible-ish). Then re-run `supabase gen types` to replace the hand-extended types.ts and re-confirm the fence on the live project (`has_column_privilege` checks).
2. Commit the scoped ternary files.
Neither done without explicit approval.
