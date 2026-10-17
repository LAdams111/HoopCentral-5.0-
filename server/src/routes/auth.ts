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

  const supabase = supabaseAuth();
  if (!supabase) {
    res.status(503).json({
      error: { code: "AUTH_NOT_CONFIGURED", message: "Sign-in is not configured" },
    });
    return;
  }

  let data: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"];
  let error: Awaited<ReturnType<typeof supabase.auth.getUser>>["error"];
  try {
    ({ data, error } = await supabase.auth.getUser(token));
  } catch {
    res.status(503).json({
      error: { code: "AUTH_UNAVAILABLE", message: "Sign-in is not available right now" },
    });
    return;
  }
  if (error || !data.user) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Sign in required" },
    });
    return;
  }

  const requested = data.user.user_metadata?.role;
  const role = typeof requested === "string" && ACCOUNT_ROLES.has(requested) ? requested : "fan";
  // app_metadata is server-only. A signup choice cannot grant this.
  const isAdmin = data.user.app_metadata?.is_admin === true;

  res.json({
    id: data.user.id,
    email: data.user.email ?? null,
    role,
    // Choosing Coach at signup does not grant stat entry.
    coachAccess: false,
    isAdmin,
  });
});
