-- ============================================================================
--  Migration 1 — init_schema
--  Mathematics Simulator / axiom — Supabase data layer (source of truth).
-- ============================================================================
--
--  Supersedes supabase/schema.sql (kept only as a design banner now).
--  Runs top-to-bottom on Supabase OR on a bare PostgreSQL instance:
--    - Supabase: the auth schema / auth.users / auth.uid() already exist, so
--      every `if not exists` / existence guard short-circuits — no clobber.
--    - Bare PG: minimal shims are created so the file (and migration 2's RLS
--      policies) parse and apply for local review.
--
--  Idempotent by construction:
--    - tables/indexes: create ... if not exists
--    - enums:          DO blocks swallowing duplicate_object
--    - triggers:       drop trigger if exists + create
--    - functions:      create or replace (+ guarded create for the auth.uid shim)
--    - comments:       comment on ... overwrites
--
--  What this migration ADDS on top of the original schema.sql design:
--    - profiles.role            (mirrors legacy User.role USER/ADMIN, lowercase)
--    - public.permissions       (mirrors legacy granular Permission table)
--    - public.presets           (NEW: user-made simulator presets)
--    - handle_new_user()        (auto-provision profile on auth.users insert)
--    - public.is_admin()        (SECURITY DEFINER helper used by RLS)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Fail fast (with a readable message) if gen_random_uuid() is unresolvable,
-- instead of a cascade of "function does not exist" deep in the DDL.
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('pg_catalog', 'public', 'extensions')
      and p.proname = 'gen_random_uuid'
  ) then
    raise exception 'gen_random_uuid() not found: install pgcrypto or use PostgreSQL 13+';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1) Enum types (verbatim from the original schema.sql design)
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.visibility_type as enum ('public', 'private', 'unlisted');
exception
  when duplicate_object then null; -- already exists - idempotent re-import
end
$$;

do $$
begin
  create type public.workspace_type as enum (
    'calculator',   -- Calculator
    'fractal_lab',  -- Fractal Lab
    'bloch_sphere', -- Bloch Sphere
    'four_d',       -- 4D ('4d' is not a valid identifier, so 'four_d')
    'topology',     -- Topology
    'dynamics',     -- Dynamics
    'inspector',    -- Inspector
    'notebook',     -- Notebook
    'docs'          -- Docs
  );
exception
  when duplicate_object then null; -- already exists - idempotent re-import
end
$$;

do $$
begin
  create type public.experiment_status as enum ('draft', 'running', 'completed', 'failed');
exception
  when duplicate_object then null; -- already exists - idempotent re-import
end
$$;

-- ---------------------------------------------------------------------------
-- 2) auth.* shims (Supabase compatibility)
-- ---------------------------------------------------------------------------
-- On Supabase these are all no-ops (schema/table/function already exist). On
-- bare PG they create minimal stand-ins so this file and migration 2 apply.
--
-- The shim auth.users carries email + raw_user_meta_data so handle_new_user()
-- has the same columns to read from as real Supabase Auth.
-- On hosted Supabase the `auth` schema/table already exist and are owned by a
-- privileged role, so a plain `create ... if not exists` raises
-- `permission denied for schema auth` (privilege is checked before existence).
-- Wrap in a DO block that swallows insufficient_privilege: no-op on hosted,
-- real shim on a bare PostgreSQL instance used for local review/tests.
do $$
begin
  create schema if not exists auth;
  create table if not exists auth.users (
    id                 uuid primary key default gen_random_uuid(),
    email              text,
    raw_user_meta_data jsonb
  );
exception when insufficient_privilege then
  null;
end
$$;

-- auth.uid() is provided by Supabase. On bare PG it is missing, which would
-- break creation of is_admin() and every RLS policy that references it. Create
-- a null-returning stub ONLY when absent, so real Supabase is never clobbered.
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    execute $f$
      create function auth.uid()
      returns uuid
      language sql
      stable
      as 'select null::uuid'
    $f$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 3) Tables
-- ---------------------------------------------------------------------------

-- 3.1 profiles ---------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid        primary key references auth.users (id) on delete cascade,
  username     text        not null,
  display_name text        not null,
  avatar_url   text,
  bio          text,
  role         text        not null default 'user',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint profiles_username_key unique (username),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,32}$'),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 500),
  constraint profiles_role_check check (role in ('user', 'admin'))
);

comment on table public.profiles is
  'Public user profile, one row per authenticated user. Extends the Supabase Auth identity with platform-facing fields.';
comment on column public.profiles.id is
  'Links to Supabase auth: references auth.users(id) (Supabase convention). Deleting the auth user cascades here.';
comment on column public.profiles.username is
  'Unique handle: 3-32 characters, lowercase letters, numbers and underscores only.';
comment on column public.profiles.display_name is 'Human display name shown on the platform.';
comment on column public.profiles.avatar_url is 'Optional avatar image URL.';
comment on column public.profiles.bio is 'Optional short biography, hard limit of 500 characters.';
comment on column public.profiles.role is
  'Authorization role, mirrors the legacy custom auth (USER/ADMIN) as lowercase user/admin. admin bypasses ownership in RLS via public.is_admin().';
comment on column public.profiles.updated_at is 'Auto-touched by the set_updated_at() trigger on every update.';

-- 3.2 workspace_metadata -----------------------------------------------------
create table if not exists public.workspace_metadata (
  id          uuid           primary key default gen_random_uuid(),
  workspace   workspace_type not null,
  name        text           not null,
  description text           not null,
  icon        text,
  route       text,
  enabled     boolean        not null default true,
  sort_order  integer        not null default 0,
  created_at  timestamptz    not null default now(),
  updated_at  timestamptz    not null default now(),
  constraint workspace_metadata_workspace_key unique (workspace),
  constraint workspace_metadata_sort_order_key unique (sort_order)
);

comment on table public.workspace_metadata is
  'Catalog of the nine Mathematics Simulator workspaces. Mirrors the local data used by the landing page (src/data/workspaces.ts); the landing can later swap that source for this table.';
comment on column public.workspace_metadata.workspace is
  'Which of the 9 workspaces this row describes. Unique: exactly one row per workspace.';
comment on column public.workspace_metadata.name is 'Human-readable workspace name.';
comment on column public.workspace_metadata.description is 'Short descriptor used in navigation and cards.';
comment on column public.workspace_metadata.icon is 'Icon identifier as a kebab-case string, e.g. ''fractal''.';
comment on column public.workspace_metadata.route is 'Route on the live app, e.g. ''/fractal-lab''.';
comment on column public.workspace_metadata.enabled is 'Whether the workspace shows up in navigation.';
comment on column public.workspace_metadata.sort_order is
  'Deterministic ordering position (1..9). Unique so no two workspaces can tie.';
comment on column public.workspace_metadata.updated_at is 'Auto-touched by the set_updated_at() trigger on every update.';

-- 3.3 projects ---------------------------------------------------------------
create table if not exists public.projects (
  id             uuid            primary key default gen_random_uuid(),
  user_id        uuid            not null references public.profiles (id) on delete cascade,
  title          text            not null,
  slug           text            not null,
  description    text,
  visibility     visibility_type not null default 'private',
  thumbnail_url  text,
  workspace_type workspace_type,
  created_at     timestamptz     not null default now(),
  updated_at     timestamptz     not null default now(),
  constraint projects_user_slug_key unique (user_id, slug),
  constraint projects_title_length check (char_length(title) between 1 and 200),
  constraint projects_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index if not exists projects_user_id_idx    on public.projects (user_id);
create index if not exists projects_created_at_idx on public.projects (created_at);
create index if not exists projects_visibility_idx on public.projects (visibility);

comment on table public.projects is
  'Saved user project: a named bundle of work inside one workspace (or several). Owned by one profile; deleting the profile cascades.';
comment on column public.projects.user_id is 'Owning profile (public.profiles.id). ON DELETE CASCADE.';
comment on column public.projects.title is 'Project title, non-empty and at most 200 characters.';
comment on column public.projects.slug is
  'URL slug, unique per owner: lowercase alphanumeric groups joined by single hyphens (same convention as the app routes).';
comment on column public.projects.visibility is
  'public: listed to everyone. unlisted: reachable by direct link. private: owner only (default).';
comment on column public.projects.thumbnail_url is 'Optional preview image URL.';
comment on column public.projects.workspace_type is 'Optional primary workspace of the project (null means mixed / not workspace-bound).';
comment on column public.projects.updated_at is 'Auto-touched by the set_updated_at() trigger on every update.';

-- 3.4 experiments ------------------------------------------------------------
create table if not exists public.experiments (
  id            uuid              primary key default gen_random_uuid(),
  project_id    uuid              not null references public.projects (id) on delete cascade,
  title         text              not null,
  description   text,
  workspace     workspace_type    not null,
  configuration jsonb             not null default '{}'::jsonb,
  status        experiment_status not null default 'draft',
  created_at    timestamptz       not null default now(),
  updated_at    timestamptz       not null default now()
);

create index if not exists experiments_project_id_idx on public.experiments (project_id);

comment on table public.experiments is
  'One saved experiment inside a project: a single workspace plus its configuration. Deleting the project cascades.';
comment on column public.experiments.project_id is 'Parent project (public.projects.id). ON DELETE CASCADE.';
comment on column public.experiments.workspace is 'Workspace the experiment runs in (decides which engine UI loads it).';
comment on column public.experiments.configuration is
  'Workspace-specific parameters (expressions, dynamical systems, iteration counts, camera settings). Stored as data only: the engine evaluates expressions through its own lexer/parser/AST, never eval.';
comment on column public.experiments.status is
  'Lifecycle of the experiment: draft (default) / running / completed / failed. Reserved for future batch execution.';
comment on column public.experiments.updated_at is 'Auto-touched by the set_updated_at() trigger on every update.';

-- 3.5 notebooks --------------------------------------------------------------
create table if not exists public.notebooks (
  id          uuid            primary key default gen_random_uuid(),
  user_id     uuid            not null references public.profiles (id) on delete cascade,
  title       text            not null,
  description text,
  content     jsonb           not null default '[]'::jsonb,
  visibility  visibility_type not null default 'private',
  created_at  timestamptz     not null default now(),
  updated_at  timestamptz     not null default now()
);

create index if not exists notebooks_user_id_idx on public.notebooks (user_id);

comment on table public.notebooks is
  'Reproducible mathematical notebook owned by a profile: ordered cells of source, results and prose.';
comment on column public.notebooks.user_id is 'Owning profile (public.profiles.id). ON DELETE CASCADE.';
comment on column public.notebooks.content is
  'Ordered array of notebook cells for reproducible experiments. Kept structured (not a blob) so runs can be replayed cell by cell.';
comment on column public.notebooks.updated_at is 'Auto-touched by the set_updated_at() trigger on every update.';

-- 3.6 examples ---------------------------------------------------------------
create table if not exists public.examples (
  id            uuid           primary key default gen_random_uuid(),
  title         text           not null,
  slug          text           not null,
  description   text,
  workspace     workspace_type not null,
  configuration jsonb          not null default '{}'::jsonb,
  featured      boolean        not null default false,
  created_at    timestamptz    not null default now(),
  updated_at    timestamptz    not null default now(),
  constraint examples_slug_key unique (slug)
);

create index if not exists examples_workspace_idx on public.examples (workspace);
create index if not exists examples_featured_idx on public.examples (featured) where featured;

comment on table public.examples is
  'Curator-managed gallery content: ready-made experiments with no owner (anyone can open them, only curators write them).';
comment on column public.examples.slug is 'Stable URL slug, globally unique (seeded via seed.sql).';
comment on column public.examples.configuration is 'Same shape as experiments.configuration, but curated and stable.';
comment on column public.examples.featured is 'Featured examples are highlighted in the gallery. Covered by a partial index.';
comment on column public.examples.updated_at is 'Auto-touched by the set_updated_at() trigger on every update.';

-- 3.7 tags -------------------------------------------------------------------
create table if not exists public.tags (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  slug       text        not null,
  created_at timestamptz not null default now(),
  constraint tags_name_key unique (name),
  constraint tags_slug_key unique (slug)
);

comment on table public.tags is
  'Shared vocabulary of topical tags applied to projects, experiments and notebooks through the join tables.';
comment on column public.tags.slug is 'Stable URL-safe identifier for the tag.';

-- 3.8 join tables ------------------------------------------------------------
create table if not exists public.experiment_tags (
  experiment_id uuid not null references public.experiments (id) on delete cascade,
  tag_id        uuid not null references public.tags (id) on delete cascade,
  constraint experiment_tags_pk primary key (experiment_id, tag_id)
);

comment on table public.experiment_tags is
  'Join table experiments <-> tags. Rows disappear with either side (cascade from both).';

create table if not exists public.project_tags (
  project_id uuid not null references public.projects (id) on delete cascade,
  tag_id     uuid not null references public.tags (id) on delete cascade,
  constraint project_tags_pk primary key (project_id, tag_id)
);

comment on table public.project_tags is
  'Join table projects <-> tags. Rows disappear with either side (cascade from both).';

create table if not exists public.notebook_tags (
  notebook_id uuid not null references public.notebooks (id) on delete cascade,
  tag_id      uuid not null references public.tags (id) on delete cascade,
  constraint notebook_tags_pk primary key (notebook_id, tag_id)
);

comment on table public.notebook_tags is
  'Join table notebooks <-> tags. Rows disappear with either side (cascade from both).';

-- 3.9 permissions (NEW) ------------------------------------------------------
-- Mirrors the legacy custom-auth Permission table: granular capability keys
-- for non-admin users. admin implicitly has all keys (enforced in app / RLS
-- via public.is_admin()).
create table if not exists public.permissions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  key        text        not null check (key in ('users:read','users:write','sessions:revoke','audit:read')),
  granted_by uuid        references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint permissions_user_key_unique unique (user_id, key)
);

create index if not exists permissions_user_id_idx on public.permissions(user_id);

comment on table public.permissions is
  'Granular capability grants for non-admin profiles (mirrors the legacy custom-auth Permission table). Admins hold every key implicitly via public.is_admin().';
comment on column public.permissions.key is
  'One of users:read | users:write | sessions:revoke | audit:read.';
comment on column public.permissions.granted_by is
  'Profile that granted this permission (audit); nulled if that profile is deleted.';

-- 3.10 presets (NEW — core new feature) --------------------------------------
create table if not exists public.presets (
  id          uuid            primary key default gen_random_uuid(),
  user_id     uuid            not null references public.profiles(id) on delete cascade,
  workspace   workspace_type  not null,
  name        text            not null,
  description text,
  config      jsonb           not null default '{}'::jsonb,
  visibility  visibility_type not null default 'private',
  created_at  timestamptz     not null default now(),
  updated_at  timestamptz     not null default now(),
  constraint presets_name_length check (char_length(name) between 1 and 120),
  constraint presets_user_workspace_name_key unique (user_id, workspace, name)
);

create index if not exists presets_user_id_idx   on public.presets(user_id);
create index if not exists presets_workspace_idx  on public.presets(workspace);
create index if not exists presets_public_idx     on public.presets(visibility) where visibility = 'public';

comment on table public.presets is
  'User-made simulator presets: a saved, reusable workspace configuration. Owned by one profile; deleting the profile cascades.';
comment on column public.presets.user_id is 'Owning profile (public.profiles.id). ON DELETE CASCADE.';
comment on column public.presets.workspace is 'Workspace this preset applies to (one of the 9 workspace_type values).';
comment on column public.presets.name is 'Preset name, non-empty and at most 120 characters. Unique per (user, workspace).';
comment on column public.presets.config is
  'Serialized simulator workspace state (same jsonb convention as experiments.configuration): data only, evaluated by the engine''s own lexer/parser/AST, never eval.';
comment on column public.presets.visibility is
  'public: shareable/listed. unlisted: reachable by direct link. private: owner only (default).';
comment on column public.presets.updated_at is 'Auto-touched by the set_updated_at() trigger on every update.';

-- ---------------------------------------------------------------------------
-- 4) updated_at auto-touch
-- ---------------------------------------------------------------------------
-- One shared trigger function bumps updated_at on every UPDATE. Attached to
-- every table that HAS an updated_at column: profiles, workspace_metadata,
-- projects, experiments, notebooks, examples, presets. tags, permissions and
-- the three join tables have no updated_at column, so they are skipped.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- PostgreSQL has no "create trigger if not exists", so drop-if-exists + create.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists workspace_metadata_set_updated_at on public.workspace_metadata;
create trigger workspace_metadata_set_updated_at
  before update on public.workspace_metadata
  for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists experiments_set_updated_at on public.experiments;
create trigger experiments_set_updated_at
  before update on public.experiments
  for each row execute function public.set_updated_at();

drop trigger if exists notebooks_set_updated_at on public.notebooks;
create trigger notebooks_set_updated_at
  before update on public.notebooks
  for each row execute function public.set_updated_at();

drop trigger if exists examples_set_updated_at on public.examples;
create trigger examples_set_updated_at
  before update on public.examples
  for each row execute function public.set_updated_at();

drop trigger if exists presets_set_updated_at on public.presets;
create trigger presets_set_updated_at
  before update on public.presets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5) handle_new_user() — auto-provision a profile per auth user
-- ---------------------------------------------------------------------------
-- Standard Supabase pattern: when a row lands in auth.users, insert the
-- matching public.profiles row. SECURITY DEFINER so it can write through
-- profiles RLS; pinned search_path to avoid hijacking. Defensive so it also
-- runs against the bare-PG shim (which has email + raw_user_meta_data).
--
-- username is derived from metadata.username or the email local-part, then
-- sanitized to the profiles_username_format constraint (^[a-z0-9_]{3,32}$).
-- On the rare username collision the ON CONFLICT DO NOTHING swallows the
-- insert (any unique constraint arbitrates) — the profile is simply not
-- auto-created and can be provisioned explicitly. Acceptable for provisioning.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_email    text  := coalesce(new.email, '');
  v_username text;
  v_display  text;
begin
  v_display := coalesce(
    nullif(v_meta->>'display_name', ''),
    nullif(v_meta->>'full_name', ''),
    nullif(v_meta->>'name', ''),
    nullif(split_part(v_email, '@', 1), ''),
    'user'
  );

  v_username := coalesce(
    nullif(v_meta->>'username', ''),
    nullif(split_part(v_email, '@', 1), ''),
    'user'
  );
  v_username := regexp_replace(lower(v_username), '[^a-z0-9_]', '_', 'g');
  if char_length(v_username) < 3 then
    -- pad from the id so the 3-char minimum is always met
    v_username := left(v_username || replace(new.id::text, '-', ''), 32);
  end if;
  v_username := left(v_username, 32);

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_display)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 6) is_admin() — RLS helper
-- ---------------------------------------------------------------------------
-- Returns true if the current auth user has profiles.role = 'admin'.
-- SECURITY DEFINER so it reads profiles bypassing profiles-RLS (otherwise the
-- admin clause of the profiles policies would recurse). STABLE + pinned
-- search_path. Referenced by every write policy in migration 2.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'RLS helper: true when the current auth.uid() maps to a profile with role = admin. SECURITY DEFINER to avoid profiles-RLS recursion.';

-- ============================================================================
--  End of migration 1 — init_schema
-- ============================================================================
