import { useState } from "react";
import { useAuth } from "@/lib/auth";

type ClaimPayload =
  | { kind: "player"; playerId: number }
  | { kind: "team"; teamSlug: string; teamName: string; leagueSlug?: string };

export function ClaimButton({ payload }: { payload: ClaimPayload }) {
  const { session } = useAuth();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async () => {
    const token = session?.access_token;
    if (!token) return;
    setState("sending");
    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      setState(response.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void submit()}
        disabled={state === "sending" || state === "sent"}
        className="inline-flex h-12 items-center justify-center rounded-xl border-2 border-primary bg-primary px-4 font-display text-sm font-bold uppercase tracking-tight text-primary-foreground disabled:opacity-70"
      >
        {state === "sent" ? "Request sent" : state === "sending" ? "Sending…" : "Claim"}
      </button>
      {state === "sent" ? (
        <p className="text-xs text-muted-foreground">Waiting for approval. Stats stay unchanged.</p>
      ) : null}
      {state === "error" ? (
        <p className="text-xs text-destructive">Could not send the request. Try again.</p>
      ) : null}
    </div>
  );
}
