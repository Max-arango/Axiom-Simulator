-- ============================================================================
--  Migration 3 — harden_functions
--  Address Supabase security-advisor lints on the functions from migration 1.
-- ============================================================================

-- Pin search_path on the updated_at trigger fn (function_search_path_mutable).
alter function public.set_updated_at() set search_path = public, pg_catalog;

-- handle_new_user() is a TRIGGER function only; it must not be reachable through
-- PostgREST /rpc. The default EXECUTE grant is to PUBLIC, so revoke from PUBLIC
-- (revoking only anon/authenticated would leave the PUBLIC grant intact). The
-- trigger still fires: trigger execution does not consult the DML role's grant.
revoke execute on function public.handle_new_user() from public;

-- is_admin() intentionally stays EXECUTE-able by anon + authenticated: it is
-- referenced by RLS policies evaluated for both roles, so revoking EXECUTE would
-- break those reads. It is a safe SECURITY DEFINER (no params, no side effects,
-- returns only whether the current auth.uid() is an admin).
