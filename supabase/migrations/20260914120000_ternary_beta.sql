-- ============================================================================
--  Migration 4 — ternary_beta
--  Access layer for the Ternary Beta: profile status, an append-only grant
--  ledger, feature-flag kill-switches, an admin audit log, and the single
--  access predicate has_ternary_beta_access().
-- ============================================================================
--
--  Depends on migrations 1-3 (public.profiles, public.is_admin(), auth.uid()).
--  Runs top-to-bottom on Supabase OR on a bare PostgreSQL instance:
--    - Supabase: the anon/authenticated roles exist, so the revoke/grant DO
--      blocks apply for real.
--    - Bare PG: those roles are absent, so each guarded DO block swallows
--      undefined_object and no-ops — the file still parses and applies for
--      local review. auth.uid() is the null-returning stub from migration 1.
--
--  Idempotent by construction:
--    - columns:      alter table ... add column if not exists
--    - constraints:  DO blocks swallowing duplicate_object
--    - tables/idx:   create ... if not exists
--    - policies:     drop policy if exists + create
--    - functions:    create or replace
--    - seed rows:    insert ... on conflict do nothing
--
--  Trust boundary: no table here has a self-write path. Users can read their
--  own grants; every write (grants, flags, audit) is admin-only via RLS, and
--  audit rows are written exclusively server-side through the service role.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- a) profiles.status — lifecycle gate consulted by has_ternary_beta_access()
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists status text not null default 'active';

-- Named + guarded so a re-run does not error on the existing constraint.
do $$
begin
  alter table public.profiles
    add constraint profiles_status_check
    check (status in ('active', 'suspended', 'revoked'));
exception
  when duplicate_object then null; -- already added - idempotent re-run
end
$$;

comment on column public.profiles.status is
  'Account lifecycle: active (default) / suspended / revoked. Only active profiles can hold experimental access. Users cannot change their own status (column UPDATE revoked below); admin edits go through the service role.';

-- ---------------------------------------------------------------------------
-- b) Close the self-escalation surface (pre-existing role hole + new status)
-- ---------------------------------------------------------------------------
-- profiles_update RLS (migration 2) lets a user update their OWN profile row
-- (auth.uid() = id). RLS gates rows, not columns, so without a column-privilege
-- fence a user could self-promote (role) or self-clear a suspension (status)
-- with a plain `update profiles set role='admin' where id = auth.uid()`.
--
-- PostgreSQL semantics (verified): a column-level `revoke update (role,status)`
-- does NOT subtract a *table-level* UPDATE grant, and Supabase grants
-- anon/authenticated table-wide UPDATE on public tables by default — so
-- revoking only those two columns would be a no-op there. We instead drop the
-- table-level UPDATE and re-grant UPDATE on the safe columns only. Net: role
-- and status become non-updatable by anon/authenticated while username,
-- display_name, avatar_url and bio stay editable. Admin edits use the service
-- role, which bypasses these grants entirely.
do $$
begin
  revoke update on public.profiles from anon, authenticated;
  grant update (username, display_name, avatar_url, bio)
    on public.profiles to anon, authenticated;
  -- The UPDATE column-grant above is bypassable via DELETE + re-INSERT: Supabase
  -- grants authenticated INSERT/DELETE on public tables by default, profiles_delete
  -- allows deleting one's own row, and profiles_insert only checks auth.uid()=id
  -- (not role/status). A user could DELETE their own profile then re-INSERT it with
  -- role='admin'. Profiles are auto-provisioned by handle_new_user() (SECURITY
  -- DEFINER, runs as owner), so anon/authenticated never need direct INSERT/DELETE.
  revoke insert, delete on public.profiles from anon, authenticated;
exception
  when undefined_object then null; -- roles absent on bare PG
end
$$;

-- b2) Defense-in-depth: even if an INSERT privilege is ever re-granted, pin the
-- security-sensitive columns so a self-insert can never mint an admin/active row.
-- handle_new_user() (SECURITY DEFINER, table owner) bypasses RLS, so this does
-- not affect signup; admin user creation uses the service role (also bypasses).
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (
    auth.uid() = id and role = 'user' and status = 'active'
  );

-- ---------------------------------------------------------------------------
-- c) ternary_beta_grants — append-only grant ledger
-- ---------------------------------------------------------------------------
-- A grant is ACTIVE iff revoked_at is null AND (expires_at is null OR
-- expires_at > now()). Revocation is a write (set revoked_at/revoked_by), never
-- a delete, so the history is preserved. Admin-only writes; no self-write path.
create table if not exists public.ternary_beta_grants (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  granted_by uuid        references public.profiles (id) on delete set null,
  reason     text,
  note       text,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid        references public.profiles (id) on delete set null
);

create index if not exists ternary_beta_grants_user_id_idx
  on public.ternary_beta_grants (user_id);

comment on table public.ternary_beta_grants is
  'Append-only ledger of Ternary Beta access grants. ACTIVE iff revoked_at is null and (expires_at is null or expires_at > now()). Revocation sets revoked_at/revoked_by rather than deleting. Writes are admin-only (RLS); consumed by has_ternary_beta_access().';
comment on column public.ternary_beta_grants.user_id is
  'Profile the grant applies to (public.profiles.id). ON DELETE CASCADE.';
comment on column public.ternary_beta_grants.granted_by is
  'Admin profile that issued the grant (audit); nulled if that profile is deleted.';
comment on column public.ternary_beta_grants.expires_at is
  'Optional expiry. null means a permanent grant.';
comment on column public.ternary_beta_grants.revoked_at is
  'When set, the grant is no longer active regardless of expires_at.';

alter table public.ternary_beta_grants enable row level security;

drop policy if exists ternary_beta_grants_select on public.ternary_beta_grants;
create policy ternary_beta_grants_select on public.ternary_beta_grants
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists ternary_beta_grants_insert on public.ternary_beta_grants;
create policy ternary_beta_grants_insert on public.ternary_beta_grants
  for insert with check (public.is_admin());

drop policy if exists ternary_beta_grants_update on public.ternary_beta_grants;
create policy ternary_beta_grants_update on public.ternary_beta_grants
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists ternary_beta_grants_delete on public.ternary_beta_grants;
create policy ternary_beta_grants_delete on public.ternary_beta_grants
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- d) feature_flags — global kill-switches (TERNARY_BETA gates access)
-- ---------------------------------------------------------------------------
create table if not exists public.feature_flags (
  key         text        primary key,
  enabled     boolean     not null default false,
  description text,
  updated_at  timestamptz not null default now()
);

comment on table public.feature_flags is
  'Global feature kill-switches. Public-readable; admin-only writes (RLS). TERNARY_BETA is the master gate consulted by has_ternary_beta_access(); the per-subsystem flags are off by default for staged rollout.';

-- Seed. on conflict do nothing keeps re-runs (and later admin edits) intact.
insert into public.feature_flags (key, enabled, description) values
  ('TERNARY_BETA',        true,  'Master gate for the Ternary Beta access layer.'),
  ('TERNARY_LOGIC',       false, 'Ternary logic subsystem (staged rollout).'),
  ('TERNARY_ALU',         false, 'Ternary ALU subsystem (staged rollout).'),
  ('TERNARY_CPU',         false, 'Ternary CPU subsystem (staged rollout).'),
  ('TERNARY_MEMORY',      false, 'Ternary memory subsystem (staged rollout).'),
  ('TERNARY_EXPERIMENTS', false, 'Ternary experiments subsystem (staged rollout).')
on conflict (key) do nothing;

alter table public.feature_flags enable row level security;

drop policy if exists feature_flags_select on public.feature_flags;
create policy feature_flags_select on public.feature_flags
  for select using (true);

drop policy if exists feature_flags_insert on public.feature_flags;
create policy feature_flags_insert on public.feature_flags
  for insert with check (public.is_admin());

drop policy if exists feature_flags_update on public.feature_flags;
create policy feature_flags_update on public.feature_flags
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists feature_flags_delete on public.feature_flags;
create policy feature_flags_delete on public.feature_flags
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- e) admin_audit_log — server-written trail of privileged actions
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id         uuid        primary key default gen_random_uuid(),
  actor      uuid        references public.profiles (id) on delete set null,
  target     uuid        references public.profiles (id) on delete set null,
  action     text        not null,
  metadata   jsonb       not null default '{}'::jsonb,
  ip_hash    text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at);

comment on table public.admin_audit_log is
  'Append-only audit trail of privileged admin actions. Reads are admin-only (RLS). Writes are performed exclusively server-side via the service role (which bypasses RLS): there is deliberately NO client insert policy, so unprivileged writes are denied by default and audit rows are unforgeable.';

alter table public.admin_audit_log enable row level security;

drop policy if exists admin_audit_log_select on public.admin_audit_log;
create policy admin_audit_log_select on public.admin_audit_log
  for select using (public.is_admin());
-- No insert/update/delete policy: writes go through the service role only.

-- ---------------------------------------------------------------------------
-- f) has_ternary_beta_access(uid) — the single access predicate
-- ---------------------------------------------------------------------------
-- true iff the profile is active AND holds an active grant AND the TERNARY_BETA
-- flag is enabled. SECURITY DEFINER so it can read grants/flags bypassing their
-- RLS (future ternary tables will call it inside their own policies, like
-- is_admin()). STABLE + pinned search_path (advisor lint from migration 3).
create or replace function public.has_ternary_beta_access(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    exists (
      select 1 from public.profiles p
      where p.id = uid and p.status = 'active'
    )
    and exists (
      select 1 from public.ternary_beta_grants g
      where g.user_id = uid
        and g.revoked_at is null
        and (g.expires_at is null or g.expires_at > now())
    )
    and exists (
      select 1 from public.feature_flags f
      where f.key = 'TERNARY_BETA' and f.enabled
    );
$$;

comment on function public.has_ternary_beta_access(uuid) is
  'Single Ternary Beta access predicate: true iff the profile is active, holds an active grant, and the TERNARY_BETA flag is enabled. SECURITY DEFINER to read grants/flags past their RLS; safe to expose (returns only a boolean about the given uid).';

-- EXECUTE for authenticated only. Future ternary-table RLS evaluates it for
-- logged-in users; anon never queries ternary resources. Two grants must be
-- stripped: the implicit PUBLIC default-grant on functions, AND the EXPLICIT
-- `anon` grant that Supabase's `alter default privileges ... grant all on
-- functions to anon` adds — `revoke ... from public` does NOT remove an explicit
-- anon grant, so anon must be named directly or it keeps EXECUTE and can probe
-- beta-holder membership for arbitrary uids (rt-2 amplifier).
do $$
begin
  revoke execute on function public.has_ternary_beta_access(uuid) from public, anon;
  grant execute on function public.has_ternary_beta_access(uuid) to authenticated;
exception
  when undefined_object then null; -- role absent on bare PG
end
$$;

-- ============================================================================
--  End of migration 4 — ternary_beta
-- ============================================================================
