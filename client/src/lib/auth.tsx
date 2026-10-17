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
};

export type AuthResult =
  | { ok: true; needsEmailConfirmation: boolean; isAdmin?: boolean }
  | { ok: false; message: string };

const AuthContext = createContext<AuthContextValue | null>(null);

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
    const token = session?.access_token;
    if (!token) {
      setIsAdmin(false);
      setAdminChecked(true);
      return;
    }
    let cancelled = false;
    setAdminChecked(false);
    void fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) return false;
        const body = (await response.json()) as { isAdmin?: boolean };
        return body.isAdmin === true;
      })
      .then((admin) => {
        if (!cancelled) setIsAdmin(admin);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      })
      .finally(() => {
        if (!cancelled) setAdminChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configError,
      session,
      email: session?.user.email ?? null,
      role: accountRole(session),
      isAdmin,
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
