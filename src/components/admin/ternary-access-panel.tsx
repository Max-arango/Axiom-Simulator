"use client";

/**
 * TernaryAccessPanel — pestaña "Ternary Beta" del panel de administración.
 *
 * Gestiona el acceso a la beta ternaria por usuario (otorgar / revocar /
 * suspender) y los feature flags globales. Solo UI: toda la lógica de red vive
 * en AdminDashboard, que pasa los callbacks y el estado "pendiente".
 *
 * Estilo alineado con UsersPanel (tokens semánticos, `mono-label`, tabla con
 * cabecera pegajosa). Sin dependencias nuevas.
 */

import { FlaskConical, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import { useId, useMemo, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import {
  FLAG_LABELS,
  GRANT_DURATIONS,
  formatDate,
  formatNumber,
  type FeatureFlag,
  type GrantDuration,
  type GrantInput,
  type TernaryStatus,
  type TernaryUser,
} from "./admin-types";

export interface TernaryAccessPanelProps {
  users: TernaryUser[];
  flags: FeatureFlag[];
  onGrant: (userId: string, input: GrantInput) => void;
  onRevoke: (userId: string) => void;
  onStatus: (userId: string, status: TernaryStatus) => void;
  onFlag: (key: string, enabled: boolean) => void;
  /** IDs de usuario con una mutación en curso (deshabilita sus acciones). */
  pendingUserIds?: ReadonlySet<string>;
  /** Claves de flag con una mutación en curso. */
  pendingFlagKeys?: ReadonlySet<string>;
}

const EMPTY_IDS: ReadonlySet<string> = new Set<string>();

const STATUS_BADGE: Record<TernaryStatus, { label: string; className?: string; variant: "outline" | "secondary" | "destructive" }> = {
  active: { label: "Activo", variant: "outline", className: "border-teal/30 bg-teal/10 text-teal" },
  suspended: { label: "Suspendido", variant: "secondary" },
  revoked: { label: "Revocado", variant: "destructive" },
};

export function TernaryAccessPanel({
  users,
  flags,
  onGrant,
  onRevoke,
  onStatus,
  onFlag,
  pendingUserIds = EMPTY_IDS,
  pendingFlagKeys = EMPTY_IDS,
}: TernaryAccessPanelProps) {
  const [query, setQuery] = useState("");
  const [grantTarget, setGrantTarget] = useState<TernaryUser | null>(null);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) return users;
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(normalizedQuery) ||
        (user.name ?? "").toLowerCase().includes(normalizedQuery),
    );
  }, [users, query]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="gap-3 border-b px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Acceso a Ternary Beta</CardTitle>
              <CardDescription>
                {users.length === 0
                  ? "Aún no hay usuarios."
                  : `${formatNumber(users.length)} ${users.length === 1 ? "usuario" : "usuarios"} en total.`}
              </CardDescription>
            </div>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre o correo…"
                aria-label="Buscar usuarios por nombre o correo"
                className="h-10 w-full pl-9 sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="scroll-thin max-h-[32rem] overflow-y-auto">
            <Table className="min-w-[52rem]">
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="mono-label px-4 font-normal text-muted-foreground sm:px-6">
                    Usuario
                  </TableHead>
                  <TableHead className="mono-label px-3 font-normal text-muted-foreground">Rol</TableHead>
                  <TableHead className="mono-label px-3 font-normal text-muted-foreground">Estado</TableHead>
                  <TableHead className="mono-label px-3 font-normal text-muted-foreground">Acceso</TableHead>
                  <TableHead className="mono-label px-3 text-right font-normal text-muted-foreground sm:pr-6">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-28 px-4 text-center text-sm text-muted-foreground sm:px-6"
                    >
                      {query.trim().length > 0
                        ? "Ningún usuario coincide con la búsqueda."
                        : "Todavía no hay cuentas registradas."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      busy={pendingUserIds.has(user.id)}
                      onGrantClick={() => setGrantTarget(user)}
                      onRevoke={onRevoke}
                      onStatus={onStatus}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <FlagsCard flags={flags} pendingFlagKeys={pendingFlagKeys} onFlag={onFlag} />

      <p className="text-xs leading-relaxed text-muted-foreground">
        Los cambios de acceso se aplican en la siguiente petición del usuario. Los administradores
        siempre pasan la puerta de acceso, independientemente de estos ajustes.
      </p>

      <GrantDialog
        target={grantTarget}
        onSubmit={(input) => {
          if (grantTarget !== null) onGrant(grantTarget.id, input);
          setGrantTarget(null);
        }}
        onClose={() => setGrantTarget(null)}
      />
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Fila de usuario
 * ------------------------------------------------------------------------ */

interface UserRowProps {
  user: TernaryUser;
  busy: boolean;
  onGrantClick: () => void;
  onRevoke: (userId: string) => void;
  onStatus: (userId: string, status: TernaryStatus) => void;
}

function UserRow({ user, busy, onGrantClick, onRevoke, onStatus }: UserRowProps) {
  const statusBadge = STATUS_BADGE[user.status];
  const nextStatus: TernaryStatus = user.status === "active" ? "suspended" : "active";
  const statusActionLabel = user.status === "active" ? "Suspender" : "Activar";

  return (
    <TableRow>
      <TableCell className="max-w-[18rem] px-4 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{user.name ?? "Sin nombre"}</p>
          <p className="truncate text-xs text-muted-foreground" title={user.email}>
            {user.email}
          </p>
        </div>
      </TableCell>
      <TableCell className="px-3">
        {user.role === "ADMIN" ? (
          <Badge variant="default">Admin</Badge>
        ) : (
          <Badge variant="outline">Usuario</Badge>
        )}
      </TableCell>
      <TableCell className="px-3">
        <Badge variant={statusBadge.variant} className={statusBadge.className}>
          {statusBadge.label}
        </Badge>
      </TableCell>
      <TableCell className="px-3">
        {user.hasAccess ? (
          <div className="flex flex-col gap-0.5">
            <Badge variant="outline" className="w-fit border-teal/30 bg-teal/10 text-teal">
              Con acceso
            </Badge>
            <span className="text-xs text-muted-foreground">
              {user.grant?.expiresAt == null
                ? "Permanente"
                : `Expira ${formatDate(user.grant.expiresAt)}`}
            </span>
          </div>
        ) : (
          <Badge variant="outline">Sin acceso</Badge>
        )}
      </TableCell>
      <TableCell className="px-3 text-right sm:pr-6">
        <div className="flex items-center justify-end gap-2">
          {busy ? (
            <LoaderCircle
              className="size-4 animate-spin text-muted-foreground"
              aria-label={`Guardando cambios de ${user.email}`}
            />
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={busy}
            onClick={() => onStatus(user.id, nextStatus)}
          >
            {statusActionLabel}
          </Button>
          {user.hasAccess ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={busy}
              onClick={() => onRevoke(user.id)}
            >
              Revocar
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={busy}
            onClick={onGrantClick}
          >
            Otorgar
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

/* --------------------------------------------------------------------------
 * Feature flags
 * ------------------------------------------------------------------------ */

interface FlagsCardProps {
  flags: FeatureFlag[];
  pendingFlagKeys: ReadonlySet<string>;
  onFlag: (key: string, enabled: boolean) => void;
}

function FlagsCard({ flags, pendingFlagKeys, onFlag }: FlagsCardProps) {
  const fieldId = useId();

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="gap-1 border-b px-4 py-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="size-4 text-muted-foreground" aria-hidden="true" />
          Feature flags
        </CardTitle>
        <CardDescription>
          Interruptores globales de la beta. <span className="font-medium">TERNARY_BETA</span> es el
          kill-switch maestro: al apagarlo se corta el acceso para todos.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {flags.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground sm:px-6">
            No hay feature flags configurados.
          </p>
        ) : (
          <ul className="divide-y">
            {flags.map((flag) => {
              const switchId = `${fieldId}-${flag.key}`;
              const isMaster = flag.key === "TERNARY_BETA";
              return (
                <li
                  key={flag.key}
                  className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label htmlFor={switchId} className="text-sm font-medium">
                        {FLAG_LABELS[flag.key] ?? flag.key}
                      </Label>
                      {isMaster ? (
                        <Badge variant="destructive" className="gap-1">
                          <ShieldCheck className="size-3" aria-hidden="true" />
                          Kill-switch
                        </Badge>
                      ) : null}
                    </div>
                    {flag.description !== null ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {flag.description}
                      </p>
                    ) : null}
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/70">{flag.key}</p>
                  </div>
                  <Switch
                    id={switchId}
                    checked={flag.enabled}
                    disabled={pendingFlagKeys.has(flag.key)}
                    onCheckedChange={(next) => onFlag(flag.key, next)}
                    aria-label={`${flag.enabled ? "Desactivar" : "Activar"} ${FLAG_LABELS[flag.key] ?? flag.key}`}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------------------
 * Diálogo: otorgar acceso
 * ------------------------------------------------------------------------ */

interface GrantDialogProps {
  target: TernaryUser | null;
  onSubmit: (input: GrantInput) => void;
  onClose: () => void;
}

function GrantDialog({ target, onSubmit, onClose }: GrantDialogProps) {
  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Otorgar acceso a Ternary Beta</DialogTitle>
          <DialogDescription>
            Concede acceso a{" "}
            <span className="font-medium text-foreground">{target?.email ?? ""}</span>. Elige la
            duración y, si quieres, deja una nota interna.
          </DialogDescription>
        </DialogHeader>
        {/* Montado solo con objetivo: el estado se reinicia al cerrar. */}
        {target !== null ? (
          <GrantForm key={target.id} onSubmit={onSubmit} onCancel={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function GrantForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: GrantInput) => void;
  onCancel: () => void;
}) {
  const fieldId = useId();
  const durationId = `${fieldId}-duration`;
  const dateId = `${fieldId}-date`;
  const reasonId = `${fieldId}-reason`;
  const noteId = `${fieldId}-note`;

  const [duration, setDuration] = useState<GrantDuration>("permanent");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let expiresAt: string | undefined;
    if (duration === "custom") {
      // <input type="date"> yields "YYYY-MM-DD"; Date parses it as UTC midnight.
      const parsed = new Date(date);
      if (date.length === 0 || Number.isNaN(parsed.getTime())) {
        setError("Elige una fecha de expiración válida.");
        return;
      }
      expiresAt = parsed.toISOString();
    }

    setError(null);
    const cleanReason = reason.trim();
    const cleanNote = note.trim();
    onSubmit({
      duration,
      ...(expiresAt !== undefined ? { expiresAt } : {}),
      ...(cleanReason.length > 0 ? { reason: cleanReason } : {}),
      ...(cleanNote.length > 0 ? { note: cleanNote } : {}),
    });
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-2">
        <Label htmlFor={durationId}>Duración</Label>
        <Select value={duration} onValueChange={(value) => setDuration(value as GrantDuration)}>
          <SelectTrigger id={durationId} className="w-full">
            <SelectValue placeholder="Selecciona la duración" />
          </SelectTrigger>
          <SelectContent>
            {GRANT_DURATIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {duration === "custom" ? (
        <div className="grid gap-2">
          <Label htmlFor={dateId}>Fecha de expiración</Label>
          <Input
            id={dateId}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
            aria-invalid={error !== null}
          />
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor={reasonId}>
          Motivo <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id={reasonId}
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Ej. programa de acceso anticipado"
          autoComplete="off"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={noteId}>
          Nota interna <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id={noteId}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Contexto visible solo para administradores…"
          rows={3}
        />
      </div>

      {error !== null ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Otorgar acceso</Button>
      </DialogFooter>
    </form>
  );
}
