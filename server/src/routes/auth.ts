import { createClient } from "@supabase/supabase-js";
import { Router } from "express";
import WebSocket from "ws";

const ACCOUNT_ROLES = new Set(["player", "parent", "coach", "scout", "fan"]);

function supabaseAuth() {
  const url = process.env.SUPABASE_URL?.trim() ?? "";
  const secret = process.env.SUPABASE_SECRET_KEY?.trim() ?? "";
  if (!url || !secret) return null;
  if (typeof globalThis.WebSocket === "undefined") {
    globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
  }
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getAuthUser(token: string): Promise<{
  id: string;
  email: string | null;
  role: string;
  isAdmin: boolean;
} | null> {
  if (!token) return null;
  const supabase = supabaseAuth();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    const requested = data.user.user_metadata?.role;
    return {
      id: data.user.id,
      email: data.user.email ?? null,
      role: typeof requested === "string" && ACCOUNT_ROLES.has(requested) ? requested : "fan",
      isAdmin: data.user.app_metadata?.is_admin === true,
    };
  } catch {
    return null;
  }
}

export const authRouter = Router();

authRouter.get("/config", (_req, res) => {
  const url = process.env.SUPABASE_URL?.trim() ?? "";
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  if (!url || !publishableKey) {
    res.status(503).json({
      error: { code: "AUTH_NOT_CONFIGURED", message: "Sign-in is not configured" },
    });
    return;
  }
  res.json({ url, publishableKey });
});

authRouter.get("/me", async (req, res) => {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Sign in required" },
    });
    return;
  }

  const user = await getAuthUser(token);
  if (!user) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Sign in required" },
    });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    // Choosing Coach at signup does not grant stat entry.
    coachAccess: false,
    isAdmin: user.isAdmin,
  });
});
