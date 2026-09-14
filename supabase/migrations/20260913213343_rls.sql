-- ============================================================================
--  Migration 2 — rls
--  Enable Row Level Security and define policies for every public table.
-- ============================================================================
--
--  Depends on migration 1 (tables + public.is_admin() + auth.uid()).
--
--  Model:
--    - auth.uid()        = current authenticated user (null on bare PG).
--    - public.is_admin() = current user has profiles.role = 'admin'
--                          (SECURITY DEFINER, bypasses profiles-RLS).
--    - service_role bypasses RLS entirely (Supabase), so seed / server-side
--      admin flows are unaffected by these policies.
--
--  Idempotent: each policy is dropped-if-exists before create. Every policy
--  that permits a write (insert/update) sets WITH CHECK; update also sets
--  USING. Policy names follow <table>_<command>.
--
--  Bare-PG note: auth.uid() is a null-returning stub there, so these policies
--  CREATE and APPLY cleanly but cannot be meaningfully exercised without a
--  real Supabase auth context. That is expected; this migration proves the
--  policies are well-formed and installable.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles — public-readable; self writes; admin override
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete using (auth.uid() = id or public.is_admin());

-- ---------------------------------------------------------------------------
-- presets — owner or public read; owner writes; admin override
-- ---------------------------------------------------------------------------
alter table public.presets enable row level security;

drop policy if exists presets_select on public.presets;
create policy presets_select on public.presets
  for select using (
    user_id = auth.uid() or visibility = 'public' or public.is_admin()
  );

drop policy if exists presets_insert on public.presets;
create policy presets_insert on public.presets
  for insert with check (user_id = auth.uid());

drop policy if exists presets_update on public.presets;
create policy presets_update on public.presets
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists presets_delete on public.presets;
create policy presets_delete on public.presets
  for delete using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- projects — owner or public read; owner/admin writes
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;

drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select using (
    user_id = auth.uid() or visibility = 'public' or public.is_admin()
  );

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
  for delete using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- experiments — visibility inherited from the parent project
-- ---------------------------------------------------------------------------
alter table public.experiments enable row level security;

drop policy if exists experiments_select on public.experiments;
create policy experiments_select on public.experiments
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = experiments.project_id
        and (p.user_id = auth.uid() or p.visibility = 'public' or public.is_admin())
    )
  );

drop policy if exists experiments_insert on public.experiments;
create policy experiments_insert on public.experiments
  for insert with check (
    exists (
      select 1 from public.projects p
      where p.id = experiments.project_id
        and (p.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists experiments_update on public.experiments;
create policy experiments_update on public.experiments
  for update using (
    exists (
      select 1 from public.projects p
      where p.id = experiments.project_id
        and (p.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = experiments.project_id
        and (p.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists experiments_delete on public.experiments;
create policy experiments_delete on public.experiments
  for delete using (
    exists (
      select 1 from public.projects p
      where p.id = experiments.project_id
        and (p.user_id = auth.uid() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- notebooks — owner or public read; owner/admin writes
-- ---------------------------------------------------------------------------
alter table public.notebooks enable row level security;

drop policy if exists notebooks_select on public.notebooks;
create policy notebooks_select on public.notebooks
  for select using (
    user_id = auth.uid() or visibility = 'public' or public.is_admin()
  );

drop policy if exists notebooks_insert on public.notebooks;
create policy notebooks_insert on public.notebooks
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists notebooks_update on public.notebooks;
create policy notebooks_update on public.notebooks
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists notebooks_delete on public.notebooks;
create policy notebooks_delete on public.notebooks
  for delete using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- examples / workspace_metadata / tags — public read; admin-only writes
-- (curator content; service_role bypasses RLS for bulk/seed edits)
-- ---------------------------------------------------------------------------
alter table public.examples enable row level security;

drop policy if exists examples_select on public.examples;
create policy examples_select on public.examples
  for select using (true);

drop policy if exists examples_insert on public.examples;
create policy examples_insert on public.examples
  for insert with check (public.is_admin());

drop policy if exists examples_update on public.examples;
create policy examples_update on public.examples
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists examples_delete on public.examples;
create policy examples_delete on public.examples
  for delete using (public.is_admin());

alter table public.workspace_metadata enable row level security;

drop policy if exists workspace_metadata_select on public.workspace_metadata;
create policy workspace_metadata_select on public.workspace_metadata
  for select using (true);

drop policy if exists workspace_metadata_insert on public.workspace_metadata;
create policy workspace_metadata_insert on public.workspace_metadata
  for insert with check (public.is_admin());

drop policy if exists workspace_metadata_update on public.workspace_metadata;
create policy workspace_metadata_update on public.workspace_metadata
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists workspace_metadata_delete on public.workspace_metadata;
create policy workspace_metadata_delete on public.workspace_metadata
  for delete using (public.is_admin());

alter table public.tags enable row level security;

drop policy if exists tags_select on public.tags;
create policy tags_select on public.tags
  for select using (true);

drop policy if exists tags_insert on public.tags;
create policy tags_insert on public.tags
  for insert with check (public.is_admin());

drop policy if exists tags_update on public.tags;
create policy tags_update on public.tags
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists tags_delete on public.tags;
create policy tags_delete on public.tags
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- join tables — SELECT if you can see the parent; write if you own it (or admin)
-- Each rule mirrors the parent table's policy via exists(...) against it.
-- ---------------------------------------------------------------------------

-- experiment_tags: parent readability/ownership resolves through experiments
-- -> projects (experiments inherit visibility from their project).
alter table public.experiment_tags enable row level security;

drop policy if exists experiment_tags_select on public.experiment_tags;
create policy experiment_tags_select on public.experiment_tags
  for select using (
    exists (
      select 1
      from public.experiments e
      join public.projects p on p.id = e.project_id
      where e.id = experiment_tags.experiment_id
        and (p.user_id = auth.uid() or p.visibility = 'public' or public.is_admin())
    )
  );

drop policy if exists experiment_tags_insert on public.experiment_tags;
create policy experiment_tags_insert on public.experiment_tags
  for insert with check (
    exists (
      select 1
      from public.experiments e
      join public.projects p on p.id = e.project_id
      where e.id = experiment_tags.experiment_id
        and (p.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists experiment_tags_update on public.experiment_tags;
create policy experiment_tags_update on public.experiment_tags
  for update using (
    exists (
      select 1
      from public.experiments e
      join public.projects p on p.id = e.project_id
      where e.id = experiment_tags.experiment_id
        and (p.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1
      from public.experiments e
      join public.projects p on p.id = e.project_id
      where e.id = experiment_tags.experiment_id
        and (p.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists experiment_tags_delete on public.experiment_tags;
create policy experiment_tags_delete on public.experiment_tags
  for delete using (
    exists (
      select 1
      from public.experiments e
      join public.projects p on p.id = e.project_id
      where e.id = experiment_tags.experiment_id
        and (p.user_id = auth.uid() or public.is_admin())
    )
  );

-- project_tags: parent is projects directly.
alter table public.project_tags enable row level security;

drop policy if exists project_tags_select on public.project_tags;
create policy project_tags_select on public.project_tags
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_tags.project_id
        and (p.user_id = auth.uid() or p.visibility = 'public' or public.is_admin())
    )
  );

drop policy if exists project_tags_insert on public.project_tags;
create policy project_tags_insert on public.project_tags
  for insert with check (
    exists (
      select 1 from public.projects p
      where p.id = project_tags.project_id
        and (p.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists project_tags_update on public.project_tags;
create policy project_tags_update on public.project_tags
  for update using (
    exists (
      select 1 from public.projects p
      where p.id = project_tags.project_id
        and (p.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_tags.project_id
        and (p.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists project_tags_delete on public.project_tags;
create policy project_tags_delete on public.project_tags
  for delete using (
    exists (
      select 1 from public.projects p
      where p.id = project_tags.project_id
        and (p.user_id = auth.uid() or public.is_admin())
    )
  );

-- notebook_tags: parent is notebooks directly.
alter table public.notebook_tags enable row level security;

drop policy if exists notebook_tags_select on public.notebook_tags;
create policy notebook_tags_select on public.notebook_tags
  for select using (
    exists (
      select 1 from public.notebooks n
      where n.id = notebook_tags.notebook_id
        and (n.user_id = auth.uid() or n.visibility = 'public' or public.is_admin())
    )
  );

drop policy if exists notebook_tags_insert on public.notebook_tags;
create policy notebook_tags_insert on public.notebook_tags
  for insert with check (
    exists (
      select 1 from public.notebooks n
      where n.id = notebook_tags.notebook_id
        and (n.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists notebook_tags_update on public.notebook_tags;
create policy notebook_tags_update on public.notebook_tags
  for update using (
    exists (
      select 1 from public.notebooks n
      where n.id = notebook_tags.notebook_id
        and (n.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.notebooks n
      where n.id = notebook_tags.notebook_id
        and (n.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists notebook_tags_delete on public.notebook_tags;
create policy notebook_tags_delete on public.notebook_tags
  for delete using (
    exists (
      select 1 from public.notebooks n
      where n.id = notebook_tags.notebook_id
        and (n.user_id = auth.uid() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- permissions — the subject can read its own grants; only admins write
-- ---------------------------------------------------------------------------
alter table public.permissions enable row level security;

drop policy if exists permissions_select on public.permissions;
create policy permissions_select on public.permissions
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists permissions_insert on public.permissions;
create policy permissions_insert on public.permissions
  for insert with check (public.is_admin());

drop policy if exists permissions_update on public.permissions;
create policy permissions_update on public.permissions
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists permissions_delete on public.permissions;
create policy permissions_delete on public.permissions
  for delete using (public.is_admin());

-- ============================================================================
--  End of migration 2 — rls
-- ============================================================================
