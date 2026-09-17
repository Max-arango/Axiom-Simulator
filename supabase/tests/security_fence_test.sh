#!/usr/bin/env bash
# ============================================================================
#  Ternary Beta — access-boundary security test (deny-by-default).
#
#  Reproduces the Supabase role model faithfully (default `grant all on tables
#  to anon, authenticated`, a settable auth.uid() from the JWT `sub` GUC),
#  applies all four migrations on a real Postgres, then asserts that a normal
#  authenticated user CANNOT escalate or self-grant, and that the access
#  predicate is correct and fail-closed.
#
#  Covers the findings from iteration 1's red-team/appsec pass:
#    rt-1  self-escalate via DELETE+re-INSERT on profiles  -> must be denied
#    rt-2  anon EXECUTE of has_ternary_beta_access          -> must be denied
#    (plus: UPDATE role/status denied, self-grant denied, predicate truth table,
#     signup path via handle_new_user still provisions a profile)
#
#  Usage:  supabase/tests/security_fence_test.sh
#  Exit 0 = all checks passed; non-zero = a security assertion failed.
#  Requires: docker + a postgres:16 image (pgcrypto included). Self-contained.
# ============================================================================
set -euo pipefail

CT=tern-fix-verify
PORT=55435
MIG_DIR="$(cd "$(dirname "$0")/../migrations" && pwd)"
export PGPASSWORD=postgres
PSQL="psql -h 127.0.0.1 -p ${PORT} -U postgres -d postgres -v ON_ERROR_STOP=1 -X -q"

cleanup() { docker rm -f "$CT" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker rm -f "$CT" >/dev/null 2>&1 || true
docker run --rm -d --name "$CT" -e POSTGRES_PASSWORD=postgres -p ${PORT}:5432 postgres:16 >/dev/null

# wait for readiness
for i in $(seq 1 30); do
  if docker exec "$CT" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done

# --- Supabase-faithful role model, set up BEFORE migrations so tables created
# --- by the migrations auto-inherit `grant all` to authenticated/anon (exactly
# --- as Supabase's default privileges do), and the migration revokes subtract.
$PSQL <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
-- Supabase default privileges: anything postgres creates in public is granted
-- to anon/authenticated. This is what makes the plain column-revoke a no-op and
-- the table-level revoke necessary.
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated;
SQL

# --- Apply all four migrations, in order, unmodified.
for f in 20260913213342_init_schema.sql 20260913213343_rls.sql 20260913213344_harden_functions.sql 20260914120000_ternary_beta.sql; do
  $PSQL -f "${MIG_DIR}/${f}" >/dev/null
done

# --- Make auth.uid() read the JWT sub GUC (as PostgREST drives it), replacing
# --- the bare-PG null stub. Seed one normal user + one admin.
$PSQL <<'SQL'
create or replace function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

-- auth.users rows (the shim table from migration 1) — insert WITHOUT firing the
-- provisioning trigger, so we control the profile rows explicitly here.
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user@x'),
  ('22222222-2222-2222-2222-222222222222', 'admin@x');
alter table auth.users enable trigger on_auth_user_created;

insert into public.profiles (id, username, display_name, role, status) values
  ('11111111-1111-1111-1111-111111111111', 'normaluser', 'Normal', 'user',  'active'),
  ('22222222-2222-2222-2222-222222222222', 'adminuser',  'Admin',  'admin', 'active');
SQL

FAILED=0
# check <name> <expect: DENY|ALLOW> <sql-as-authenticated-normal-user>
check() {
  local name="$1" expect="$2" sql="$3"
  local out
  # "denied" = the write raised insufficient_privilege OR RLS USING silently
  # filtered it to zero rows (an RLS-blocked UPDATE/DELETE raises nothing, it just
  # affects 0 rows). "allowed" requires no exception AND at least one row changed.
  out=$($PSQL -v ON_ERROR_STOP=0 <<SQL 2>&1 || true
begin;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do \$\$ declare n int; begin
  ${sql};
  get diagnostics n = row_count;
  if n > 0 then raise notice 'RESULT: allowed'; else raise notice 'RESULT: denied'; end if;
exception when insufficient_privilege then raise notice 'RESULT: denied';
end \$\$;
rollback;
SQL
)
  local got=denied
  echo "$out" | grep -q 'RESULT: allowed' && got=allowed
  local want=denied; [ "$expect" = ALLOW ] && want=allowed
  if [ "$got" = "$want" ]; then
    echo "  PASS  $name ($got)"
  else
    echo "  FAIL  $name (expected $want, got $got)"; FAILED=1
  fi
}

echo "== authenticated normal user — escalation attempts =="
check "rt-1a UPDATE role=admin"          DENY "update public.profiles set role='admin' where id='11111111-1111-1111-1111-111111111111'"
check "rt-1b UPDATE status=active"       DENY "update public.profiles set status='active' where id='11111111-1111-1111-1111-111111111111'"
check "rt-1c DELETE own profile"         DENY "delete from public.profiles where id='11111111-1111-1111-1111-111111111111'"
check "rt-1d INSERT admin profile"       DENY "insert into public.profiles(id,username,display_name,role,status) values('33333333-3333-3333-3333-333333333333','x','x','admin','active')"
check "legit UPDATE display_name"        ALLOW "update public.profiles set display_name='Renamed' where id='11111111-1111-1111-1111-111111111111'"
check "self-grant ternary_beta"          DENY "insert into public.ternary_beta_grants(user_id) values('11111111-1111-1111-1111-111111111111')"
check "forge audit row"                  DENY "insert into public.admin_audit_log(actor,action) values('11111111-1111-1111-1111-111111111111','forge')"
check "flip feature flag"                DENY "update public.feature_flags set enabled=true where key='TERNARY_ALU'"

echo "== rt-2: anon cannot execute the access predicate =="
anon_out=$($PSQL -v ON_ERROR_STOP=0 <<'SQL' 2>&1 || true
begin;
set local role anon;
do $$ begin
  perform public.has_ternary_beta_access('11111111-1111-1111-1111-111111111111');
  raise notice 'RESULT: allowed';
exception when insufficient_privilege then raise notice 'RESULT: denied';
end $$;
rollback;
SQL
)
if echo "$anon_out" | grep -q 'RESULT: denied'; then echo "  PASS  anon EXECUTE denied"; else echo "  FAIL  anon EXECUTE not denied"; FAILED=1; fi

echo "== access predicate truth table (as owner) =="
# helper: assert has_ternary_beta_access(uid) equals expected after a setup
pred() { # <name> <expected t|f> <setup-sql>
  local name="$1" exp="$2" setup="$3"
  local got
  # The setup statement may itself emit rows (e.g. `select 1`); the predicate is
  # always the LAST row printed, so read only that line.
  got=$($PSQL -t -A <<SQL 2>/dev/null | tail -n1
begin;
${setup};
select public.has_ternary_beta_access('11111111-1111-1111-1111-111111111111');
rollback;
SQL
)
  got=$(echo "$got" | tr -d '[:space:]')
  if [ "$got" = "$exp" ]; then echo "  PASS  $name ($got)"; else echo "  FAIL  $name (expected $exp got $got)"; FAILED=1; fi
}
pred "no grant -> false"        f "select 1"
pred "active grant -> true"     t "insert into public.ternary_beta_grants(user_id) values('11111111-1111-1111-1111-111111111111')"
pred "expired grant -> false"   f "insert into public.ternary_beta_grants(user_id,expires_at) values('11111111-1111-1111-1111-111111111111', now() - interval '1 day')"
pred "expiry=now -> false"      f "insert into public.ternary_beta_grants(user_id,expires_at) values('11111111-1111-1111-1111-111111111111', now())"
pred "revoked -> false"         f "insert into public.ternary_beta_grants(user_id,revoked_at) values('11111111-1111-1111-1111-111111111111', now())"
pred "suspended profile -> false" f "insert into public.ternary_beta_grants(user_id) values('11111111-1111-1111-1111-111111111111'); update public.profiles set status='suspended' where id='11111111-1111-1111-1111-111111111111'"
pred "flag off -> false"        f "insert into public.ternary_beta_grants(user_id) values('11111111-1111-1111-1111-111111111111'); update public.feature_flags set enabled=false where key='TERNARY_BETA'"

echo "== signup path: handle_new_user provisions a profile =="
prov=$($PSQL -t -A <<'SQL' 2>/dev/null
insert into auth.users (id, email, raw_user_meta_data)
  values ('44444444-4444-4444-4444-444444444444', 'new@x', '{"display_name":"New"}');
select role from public.profiles where id='44444444-4444-4444-4444-444444444444';
SQL
)
prov=$(echo "$prov" | tr -d '[:space:]')
if [ "$prov" = "user" ]; then echo "  PASS  new signup -> profile role=user"; else echo "  FAIL  signup provisioning (got '$prov')"; FAILED=1; fi

echo
if [ "$FAILED" = 0 ]; then echo "ALL SECURITY CHECKS PASSED"; else echo "SECURITY CHECKS FAILED"; fi
exit $FAILED
