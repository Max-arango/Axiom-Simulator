/**
 * Ternary Beta access layer — server surface.
 *
 * Only the SERVER pieces are re-exported here (guards + audit). The client hook
 * lives at "@/lib/ternary-access/use-ternary-access" and must be imported
 * directly: re-exporting it through this barrel would drag guard.ts ->
 * supabase/server.ts (next/headers) into client bundles and break the build.
 */
export { requireTernaryBeta, getTernaryAccess } from "./guard";
export { writeAudit } from "./audit";
