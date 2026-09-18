/**
 * Shared types, constants and pure helpers for the admin dashboard UI.
 *
 * This module is intentionally free of React so the data/contract layer stays
 * separate from the presentation. It implements the admin API contract:
 *
 *   GET    /api/admin/overview
 *   GET    /api/admin/users
 *   POST   /api/admin/users
 *   PATCH  /api/admin/users/{id}
 *   DELETE /api/admin/users/{id}
 *   GET    /api/admin/login-attempts?limit=50
 *
 * All responses are normalized defensively (the API is built in parallel, so
 * malformed or partial payloads must never crash the UI).
 */

/* ------------------------------- Domain --------------------------------- */

export type AdminRole = "USER" | "ADMIN";

export interface AdminUserEmail {
  address: string;
  isPrimary: boolean;
  isVerified: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  isActive: boolean;
  permissions: string[];
  emails: AdminUserEmail[];
  createdAt: string;
  lastLoginAt: string | null;
  activeSessions: number;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ip: string;
  userAgent: string;
  success: boolean;
  reason: string | null;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  activeSessions: number;
  failedAttempts24h: number;
  totalAttempts24h: number;
}

/* Raw JSON payload shapes — fields are unknown and normalized before use. */
export interface OverviewPayload {
  stats?: unknown;
  recentAttempts?: unknown;
}
export interface UsersPayload {
  users?: unknown;
}
export interface AttemptsPayload {
  attempts?: unknown;
}
export interface UserMutationPayload {
  user?: unknown;
}
export interface OkPayload {
  ok?: unknown;
}

/* --------------------------- Permission catalog -------------------------- */

export interface PermissionDefinition {
  id: string;
  label: string;
  description: string;
}

export const PERMISSION_CATALOG: readonly PermissionDefinition[] = [
  { id: "users:read", label: "Ver usuarios", description: "Consultar el listado de cuentas." },
  { id: "users:write", label: "Gestionar usuarios", description: "Crear, editar y desactivar cuentas." },
  { id: "sessions:revoke", label: "Revocar sesiones", description: "Cerrar sesiones activas de otras cuentas." },
  { id: "audit:read", label: "Ver auditoría", description: "Consultar intentos de inicio de sesión." },
];

export const ROLE_OPTIONS: readonly { value: AdminRole; label: string }[] = [
  { value: "USER", label: "Usuario" },
  { value: "ADMIN", label: "Administrador" },
];

/* ------------------------------ Validation ------------------------------- */

export const MIN_PASSWORD_LENGTH = 8;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------ API client ------------------------------- */

export class ApiError extends Error {
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const FALLBACK_MESSAGES: Readonly<Record<number, string>> = {
  401: "Necesitas iniciar sesión para acceder al panel de administración.",
  403: "No tienes permisos de administrador para realizar esta acción.",
  404: "El recurso solicitado no existe.",
  429: "Demasiadas solicitudes. Inténtalo de nuevo en unos segundos.",
};

/**
 * Same-origin JSON fetch with graceful handling of non-JSON responses.
 * Cookies are sent automatically (credentials: "same-origin").
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      cache: "no-store",
      credentials: "same-origin",
      ...init,
      headers: {
        ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
  }

  const text = await response.text().catch(() => "");
  let payload: unknown = null;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const record = isRecord(payload) ? payload : {};
    const serverMessage =
      typeof record.error === "string" && record.error.trim().length > 0
        ? record.error.trim()
        : (FALLBACK_MESSAGES[response.status] ?? `Error inesperado (HTTP ${response.status}).`);
    const retryAfterSeconds =
      typeof record.retryAfterSeconds === "number" && Number.isFinite(record.retryAfterSeconds)
        ? record.retryAfterSeconds
        : undefined;
    const message =
      response.status === 429 && retryAfterSeconds !== undefined
        ? `${serverMessage} Espera ${retryAfterSeconds} segundos e inténtalo de nuevo.`
        : serverMessage;
    throw new ApiError(response.status, message, retryAfterSeconds);
  }

  // Success payloads are JSON objects per the contract; coerce anything else
  // to an empty record so callers can safely read optional fields.
  return (isRecord(payload) ? payload : {}) as T;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/* ------------------------------ Normalizers ------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toSafeArray<T>(value: unknown, map: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(map).filter((item): item is T => item !== null);
}

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function normalizeStats(value: unknown): AdminStats {
  const record = isRecord(value) ? value : {};
  return {
    totalUsers: toFiniteNumber(record.totalUsers),
    activeUsers: toFiniteNumber(record.activeUsers),
    adminUsers: toFiniteNumber(record.adminUsers),
    activeSessions: toFiniteNumber(record.activeSessions),
    failedAttempts24h: toFiniteNumber(record.failedAttempts24h),
    totalAttempts24h: toFiniteNumber(record.totalAttempts24h),
  };
}

export function normalizeUser(value: unknown): AdminUser | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.email !== "string") {
    return null;
  }
  const emails = toSafeArray(value.emails, (item) => {
    if (!isRecord(item) || typeof item.address !== "string") return null;
    return {
      address: item.address,
      isPrimary: item.isPrimary === true,
      isVerified: item.isVerified === true,
    } satisfies AdminUserEmail;
  });
  // Primary address first so it renders as the main line in the UI.
  emails.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

  return {
    id: value.id,
    email: value.email,
    name: typeof value.name === "string" && value.name.trim().length > 0 ? value.name : null,
    role: value.role === "ADMIN" ? "ADMIN" : "USER",
    isActive: value.isActive !== false,
    permissions: toSafeArray(value.permissions, (item) => (typeof item === "string" ? item : null)),
    emails,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    lastLoginAt: typeof value.lastLoginAt === "string" ? value.lastLoginAt : null,
    activeSessions: toFiniteNumber(value.activeSessions),
  };
}

export function normalizeUsers(value: unknown): AdminUser[] {
  return toSafeArray(value, normalizeUser);
}

export function normalizeAttempt(value: unknown): LoginAttempt | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.email !== "string") {
    return null;
  }
  return {
    id: value.id,
    email: value.email,
    ip: typeof value.ip === "string" && value.ip.length > 0 ? value.ip : "—",
    userAgent: typeof value.userAgent === "string" ? value.userAgent : "",
    success: value.success === true,
    reason: typeof value.reason === "string" ? value.reason : null,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
  };
}

export function normalizeAttempts(value: unknown): LoginAttempt[] {
  return toSafeArray(value, normalizeAttempt);
}

/* --------------------------- Labels & formats ---------------------------- */

const ATTEMPT_REASON_LABELS: Readonly<Record<string, string>> = {
  ok: "Credenciales correctas",
  unknown_email: "Correo desconocido",
  bad_password: "Contraseña incorrecta",
  inactive: "Cuenta inactiva",
  rate_limited: "Demasiados intentos",
};

export function attemptReasonLabel(reason: string | null): string {
  if (reason === null || reason.trim().length === 0) return "—";
  return ATTEMPT_REASON_LABELS[reason] ?? reason;
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const DATE_FORMAT = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const NUMBER_FORMAT = new Intl.NumberFormat("es-ES");

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : DATE_TIME_FORMAT.format(date);
}

export function formatDate(iso: string | null): string {
  if (iso === null) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : DATE_FORMAT.format(date);
}

export function formatNumber(value: number): string {
  return Number.isFinite(value) ? NUMBER_FORMAT.format(value) : "—";
}

export function userInitials(user: Pick<AdminUser, "name" | "email">): string {
  const trimmedName = (user.name ?? "").trim();
  const source = trimmedName.length > 0 ? trimmedName : user.email;
  const parts = source.split(/[\s._@-]+/).filter((part) => part.length > 0);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/* --------------------------- Ternary Beta access ------------------------- */
/**
 * Contract for the Ternary Beta admin API (built in parallel to this UI):
 *
 *   GET   /api/admin/ternary                 -> { users, flags }
 *   POST  /api/admin/ternary/grant           -> { user }
 *   POST  /api/admin/ternary/revoke          -> { user }
 *   PATCH /api/admin/ternary/status          -> { user }
 *   PATCH /api/admin/ternary/flags           -> { flags }
 */

export type TernaryStatus = "active" | "suspended" | "revoked";

export interface TernaryGrant {
  grantedAt: string;
  expiresAt: string | null;
  reason: string | null;
  note: string | null;
}

export interface TernaryUser {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  status: TernaryStatus;
  hasAccess: boolean;
  grant: TernaryGrant | null;
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
}

export type GrantDuration = "permanent" | "7d" | "30d" | "90d" | "custom";

/** Body sent to POST /api/admin/ternary/grant (minus the userId). */
export interface GrantInput {
  duration: GrantDuration;
  expiresAt?: string;
  reason?: string;
  note?: string;
}

/* Raw JSON payload shapes — normalized before use. */
export interface TernaryPayload {
  users?: unknown;
  flags?: unknown;
}
export interface TernaryUserMutationPayload {
  user?: unknown;
}
export interface FlagsMutationPayload {
  flags?: unknown;
}

export const GRANT_DURATIONS: readonly { value: GrantDuration; label: string }[] = [
  { value: "permanent", label: "Permanente" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "custom", label: "Personalizada" },
];

export const FLAG_LABELS: Record<string, string> = {
  TERNARY_BETA: "Ternary Beta (acceso maestro)",
  TERNARY_LOGIC: "Lógica ternaria",
  TERNARY_ALU: "ALU ternaria",
  TERNARY_CPU: "CPU ternaria",
  TERNARY_MEMORY: "Memoria ternaria",
  TERNARY_EXPERIMENTS: "Experimentos ternarios",
};

const TERNARY_STATUSES: readonly TernaryStatus[] = ["active", "suspended", "revoked"];

function toTernaryStatus(value: unknown): TernaryStatus {
  // Least-privilege default: an unrecognized status reads as "revoked".
  return typeof value === "string" && (TERNARY_STATUSES as readonly string[]).includes(value)
    ? (value as TernaryStatus)
    : "revoked";
}

function normalizeGrant(value: unknown): TernaryGrant | null {
  if (!isRecord(value)) return null;
  return {
    grantedAt: typeof value.grantedAt === "string" ? value.grantedAt : "",
    expiresAt: typeof value.expiresAt === "string" ? value.expiresAt : null,
    reason: typeof value.reason === "string" && value.reason.trim().length > 0 ? value.reason : null,
    note: typeof value.note === "string" && value.note.trim().length > 0 ? value.note : null,
  };
}

export function normalizeTernaryUser(value: unknown): TernaryUser | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.email !== "string") {
    return null;
  }
  return {
    id: value.id,
    email: value.email,
    name: typeof value.name === "string" && value.name.trim().length > 0 ? value.name : null,
    role: value.role === "ADMIN" ? "ADMIN" : "USER",
    status: toTernaryStatus(value.status),
    hasAccess: value.hasAccess === true,
    grant: normalizeGrant(value.grant),
  };
}

export function normalizeTernaryUsers(value: unknown): TernaryUser[] {
  return toSafeArray(value, normalizeTernaryUser);
}

export function normalizeFlag(value: unknown): FeatureFlag | null {
  if (!isRecord(value) || typeof value.key !== "string" || value.key.length === 0) {
    return null;
  }
  return {
    key: value.key,
    enabled: value.enabled === true,
    description:
      typeof value.description === "string" && value.description.trim().length > 0
        ? value.description
        : null,
  };
}

export function normalizeFlags(value: unknown): FeatureFlag[] {
  return toSafeArray(value, normalizeFlag);
}
