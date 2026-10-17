import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type LoginRole = "player" | "parent" | "coach" | "scout" | "fan";

type AuthContextValue = {
  ready: boolean;
  configError: string | null;
  session: Session | null;
  email: string | null;
  role: LoginRole;
  isAdmin: boolean;
  adminChecked: boolean;
  signUp: (input: { email: string; password: string; role: LoginRole }) => Promise<AuthResult>;
  signIn: (input: { email: string; password: string }) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
};

export type AuthResult =
  | { ok: true; needsEmailConfirmation: boolean; isAdmin?: boolean }
  | { ok: false; message: string };

const AuthContext = createContext<AuthContextValue | null>(null);

function sessionIsAdmin(session: Session | null): boolean {
  return session?.user.app_metadata?.is_admin === true;
}

function accountRole(session: Session | null): LoginRole {
  const requested = session?.user.user_metadata?.role;
  if (
    requested === "player" ||
    requested === "parent" ||
    requested === "coach" ||
    requested === "scout" ||
    requested === "fan"
  ) {
    return requested;
  }
  return "fan";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    async function start() {
      let response: Response;
      try {
        response = await fetch("/api/auth/config");
      } catch {
        if (!cancelled) {
          setConfigError("Sign-in is not available right now.");
          setReady(true);
        }
        return;
      }

      if (!response.ok) {
        if (!cancelled) {
          setConfigError("Sign-in is not available right now.");
          setReady(true);
        }
        return;
      }

      const config = (await response.json()) as { url?: string; publishableKey?: string };
      if (!config.url || !config.publishableKey) {
        if (!cancelled) {
          setConfigError("Sign-in is not available right now.");
          setReady(true);
        }
        return;
      }

      const supabase = createClient(config.url, config.publishableKey, {
        auth: {
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      const { data } = await supabase.auth.getSession();
      const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
        setSession(next);
      });
      unsubscribe = () => listener.subscription.unsubscribe();

      if (cancelled) {
        unsubscribe();
        return;
      }
      setClient(supabase);
      setSession(data.session);
      setReady(true);
    }

    void start();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      setAdminChecked(true);
      return;
    }
    if (sessionIsAdmin(session)) setIsAdmin(true);
    if (!client) return;

    let cancelled = false;
    void (async () => {
      const refreshed = await client.auth.refreshSession();
      const next = refreshed.data.session ?? session;
      const token = next.access_token;
      let admin = sessionIsAdmin(next);
      if (token) {
        try {
          const response = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const body = (await response.json()) as { isAdmin?: boolean };
            admin = body.isAdmin === true || admin;
          }
        } catch {
          /* keep the session flag */
        }
      }
      if (!cancelled) {
        setIsAdmin(admin);
        setAdminChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configError,
      session,
      email: session?.user.email ?? null,
      role: accountRole(session),
      isAdmin: isAdmin || sessionIsAdmin(session),
      adminChecked,
      async signUp({ email, password, role }) {
        if (!client) return { ok: false, message: "Sign-in is not available right now." };
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: { role },
          },
        });
        if (error) return { ok: false, message: error.message };
        return { ok: true, needsEmailConfirmation: !data.session };
      },
      async signIn({ email, password }) {
        if (!client) return { ok: false, message: "Sign-in is not available right now." };
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) return { ok: false, message: error.message };
        const token = data.session?.access_token;
        if (!token) return { ok: true, needsEmailConfirmation: false, isAdmin: false };
        try {
          const response = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) return { ok: true, needsEmailConfirmation: false, isAdmin: false };
          const body = (await response.json()) as { isAdmin?: boolean };
          return { ok: true, needsEmailConfirmation: false, isAdmin: body.isAdmin === true };
        } catch {
          return { ok: true, needsEmailConfirmation: false, isAdmin: false };
        }
      },
      async signOut() {
        if (!client) return;
        await client.auth.signOut();
      },
      async refreshAccessToken() {
        if (!client) return null;
        const refreshed = await client.auth.refreshSession();
        if (refreshed.data.session?.access_token) return refreshed.data.session.access_token;
        const current = await client.auth.getSession();
        return current.data.session?.access_token ?? null;
      },
    }),
    [adminChecked, client, configError, isAdmin, ready, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
