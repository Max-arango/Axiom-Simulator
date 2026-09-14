"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side auth state, backed by Supabase Auth. The Supabase browser
 * client holds the session in cookies; `buildUser()` composes a ClientUser
 * from the auth user plus the `profiles` / `permissions` rows.
 */

export interface ClientUser {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  isActive: boolean;
  permissions: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

interface AuthContextValue {
  user: ClientUser | null;
  /** True until the initial session lookup resolves. */
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<ClientUser>;
  register: (email: string, name: string | undefined, password: string) => Promise<ClientUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export class AuthRequestError extends Error {
  readonly status: number;
  readonly retryAfterSeconds?: number;
  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Map the handful of Supabase auth messages we surface to Spanish copy. */
function translateAuthError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (msg.includes("User already registered")) return "Ese correo ya está registrado.";
  if (msg.includes("Password should be at least"))
    return "La contraseña es demasiado corta (mínimo 8 caracteres).";
  return msg;
}

function getSupabaseClient() {
  try {
    return createClient();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState<ReturnType<typeof createClient> | null>(() => getSupabaseClient());
  const [user, setUser] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setConfigError("Supabase no configurado: faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      setLoading(false);
    }
  }, [supabase]);

  const buildUser = useCallback(async (): Promise<ClientUser | null> => {
    if (!supabase) return null;
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", authUser.id)
      .maybeSingle();

    const { data: perms } = await supabase
      .from("permissions")
      .select("key")
      .eq("user_id", authUser.id);

    return {
      id: authUser.id,
      email: authUser.email ?? "",
      name:
        profile?.display_name ??
        ((authUser.user_metadata?.display_name as string | undefined) ?? null),
      role: profile?.role === "admin" ? "ADMIN" : "USER",
      isActive: true,
      permissions: (perms ?? []).map((p) => p.key),
      createdAt: authUser.created_at,
      lastLoginAt: authUser.last_sign_in_at ?? null,
    };
  }, [supabase]);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setUser(await buildUser());
    setLoading(false);
  }, [buildUser, supabase]);

  useEffect(() => {
    if (!supabase) return;
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase, refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new AuthRequestError(500, "Supabase no configurado");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new AuthRequestError(400, translateAuthError(error.message));
      const u = await buildUser();
      setUser(u);
      if (!u) throw new AuthRequestError(400, "No se pudo cargar la sesión.");
      return u;
    },
    [supabase, buildUser],
  );

  const register = useCallback(
    async (email: string, name: string | undefined, password: string) => {
      if (!supabase) throw new AuthRequestError(500, "Supabase no configurado");
      const username = (name || email.split("@")[0] || "user")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .slice(0, 32);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name ?? null, username } },
      });
      if (error) throw new AuthRequestError(400, translateAuthError(error.message));
      if (!data.session)
        throw new AuthRequestError(
          200,
          "Cuenta creada. Revisa tu correo para confirmarla antes de entrar.",
        );
      const u = await buildUser();
      setUser(u);
      if (!u) throw new AuthRequestError(400, "No se pudo cargar la sesión.");
      return u;
    },
    [supabase, buildUser],
  );

  const logout = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  const value = useMemo(
    () => ({ user, loading, refresh, login, register, logout }),
    [user, loading, refresh, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>.");
  return ctx;
}
