import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { getPlayer } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type PlayerForm = {
  position: string;
  height: string;
  weight: string;
  hometown: string;
  country: string;
  birthDate: string;
  jerseyNumber: string;
  bio: string;
  proof: string;
};

const EMPTY_FORM: PlayerForm = {
  position: "",
  height: "",
  weight: "",
  hometown: "",
  country: "",
  birthDate: "",
  jerseyNumber: "",
  bio: "",
  proof: "",
};

function shown(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  if (!text || text === "—" || text === "-") return "";
  return text;
}

const POSITIONS = ["PG", "SG", "G", "SF", "PF", "F", "C", "G/F", "F/C"];

function fieldClassName() {
  return "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
}

function heightInches(value: string): number {
  const match = value.match(/(\d+)\s*'\s*(\d{1,2})/);
  if (!match) return 78;
  return Math.min(96, Math.max(58, Number(match[1]) * 12 + Number(match[2])));
}

function formatInches(total: number): string {
  return `${Math.floor(total / 12)}'${total % 12}"`;
}

function weightPounds(value: string): number {
  const match = value.match(/(\d{2,3})/);
  if (!match) return 180;
  return Math.min(400, Math.max(100, Number(match[1])));
}

async function preparePhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Use a JPG or PNG.");
  if (file.size > 12 * 1024 * 1024) throw new Error("That photo is too large.");
  const bitmap = await createImageBitmap(file);
  const max = 900;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that photo.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Could not read that photo.");
  return blob;
}

export function ClaimPlayer() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { ready, email, session } = useAuth();
  const playerId = Number(id);
  const allowed = params.get("claim") === "player" && Number.isInteger(playerId) && playerId > 0;
  const nextPath = `/players/${playerId}/claim?claim=player`;
  const playerQuery = useQuery({
    queryKey: ["claim-player", playerId],
    enabled: allowed,
    queryFn: () => getPlayer(playerId),
  });
  const [form, setForm] = useState<PlayerForm>(EMPTY_FORM);
  const [filled, setFilled] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const player = playerQuery.data;
    if (!player || filled) return;
    setForm({
      position: shown(player.position),
      height: shown(player.height),
      weight: shown(player.weight),
      hometown: shown(player.hometown),
      country: shown(player.country),
      birthDate: player.birthDate?.slice(0, 10) ?? "",
      jerseyNumber: shown(player.jerseyNumber),
      bio: player.bio ?? "",
      proof: "",
    });
    setFilled(true);
  }, [playerQuery.data, filled]);

  if (!allowed) {
    return <Navigate to={Number.isInteger(playerId) && playerId > 0 ? `/players/${playerId}` : "/"} replace />;
  }

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!email) {
    return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />;
  }

  const set = (key: keyof PlayerForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    const token = session?.access_token;
    if (!token) return;
    setState("sending");
    setMessage("");
    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: "player",
          playerId,
          proof: form.proof,
          proposed: {
            position: form.position,
            height: form.height,
            weight: form.weight,
            hometown: form.hometown,
            country: form.country,
            birthDate: form.birthDate,
            jerseyNumber: form.jerseyNumber,
            bio: form.bio,
          },
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        setMessage(body?.error?.message || "Could not send the request.");
        setState("error");
        return;
      }
      const saved = (await response.json()) as { id?: number };
      if (photoFile && saved.id) {
        const photo = await preparePhoto(photoFile);
        const uploaded = await fetch(`/api/claims/${saved.id}/photo`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "image/jpeg",
          },
          body: photo,
        });
        if (!uploaded.ok) {
          setMessage("The request was saved, but the photo did not upload. Submit again to retry the photo.");
          setState("error");
          return;
        }
      }
      setState("sent");
    } catch {
      setMessage("Could not send the request.");
      setState("error");
    }
  };

  const player = playerQuery.data;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link to={`/players/${playerId}?claim=player`} className="font-mono text-xs uppercase tracking-wide text-primary">
        Back to profile
      </Link>
      <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight">
        {player?.name ?? "Claim player"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Send the bio and information that should be checked. Stats stay off this form.
      </p>

      {state === "sent" ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="font-display text-2xl font-bold">Request sent</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The bio changes are waiting for review. Approving them updates the profile. Stats stay unchanged.
          </p>
        </section>
      ) : playerQuery.isError ? (
        <p className="mt-6 text-sm text-destructive">Could not load this player.</p>
      ) : (
        <form
          className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="block text-sm">
            Position
            <span className="mt-1 block font-mono text-xs text-muted-foreground">{form.position || "Not set"}</span>
            <input
              type="range"
              min={0}
              max={POSITIONS.length - 1}
              value={Math.max(0, POSITIONS.indexOf(form.position))}
              onChange={(event) => set("position", POSITIONS[Number(event.target.value)] ?? "")}
              className="mt-2 w-full accent-primary"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Height
              <span className="mt-1 block font-mono text-xs text-muted-foreground">{form.height || "Not set"}</span>
              <input
                type="range"
                min={58}
                max={96}
                value={heightInches(form.height)}
                onChange={(event) => set("height", formatInches(Number(event.target.value)))}
                className="mt-2 w-full accent-primary"
              />
            </label>
            <label className="block text-sm">
              Weight
              <span className="mt-1 block font-mono text-xs text-muted-foreground">{form.weight || "Not set"}</span>
              <input
                type="range"
                min={100}
                max={400}
                value={weightPounds(form.weight)}
                onChange={(event) => set("weight", `${event.target.value} lbs`)}
                className="mt-2 w-full accent-primary"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Hometown
              <input className={fieldClassName()} value={form.hometown} onChange={(event) => set("hometown", event.target.value)} />
            </label>
            <label className="block text-sm">
              Country
              <input className={fieldClassName()} value={form.country} onChange={(event) => set("country", event.target.value)} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Birth date
              <input type="date" className={fieldClassName()} value={form.birthDate} onChange={(event) => set("birthDate", event.target.value)} />
            </label>
            <label className="block text-sm">
              Jersey
              <input className={fieldClassName()} value={form.jerseyNumber} onChange={(event) => set("jerseyNumber", event.target.value)} />
            </label>
          </div>
          <label className="block text-sm">
            Bio
            <textarea
              className={`${fieldClassName()} min-h-28`}
              placeholder="Awards, achievements, history, stories, and anything else worth knowing"
              value={form.bio}
              onChange={(event) => set("bio", event.target.value)}
            />
          </label>
          <label className="block text-sm">
            Photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-1 block w-full text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setPhotoFile(file);
                setPhotoPreview((current) => {
                  if (current) URL.revokeObjectURL(current);
                  return file ? URL.createObjectURL(file) : "";
                });
              }}
            />
          </label>
          {photoPreview ? (
            <img src={photoPreview} alt="" className="h-32 w-32 rounded-xl object-cover" />
          ) : null}
          <label className="block text-sm">
            Proof
            <textarea
              className={`${fieldClassName()} min-h-28`}
              placeholder="Link, team email, or how this can be checked"
              value={form.proof}
              onChange={(event) => set("proof", event.target.value)}
            />
          </label>
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
          <button
            type="submit"
            disabled={state === "sending"}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-5 font-display text-sm font-bold uppercase tracking-tight text-primary-foreground disabled:opacity-60"
          >
            {state === "sending" ? "Sending…" : "Submit for review"}
          </button>
        </form>
      )}
    </div>
  );
}

export function ClaimTeam() {
  const [params] = useSearchParams();
  const { ready, email, session } = useAuth();
  const teamSlug = params.get("teamSlug") ?? "";
  const leagueSlug = params.get("leagueSlug") ?? "";
  const teamName = params.get("teamName") ?? teamSlug;
  const allowed = params.get("claim") === "team" && teamSlug.length > 0;
  const nextPath = `/claim/team?${params.toString()}`;
  const [note, setNote] = useState("");
  const [proof, setProof] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  if (!allowed) return <Navigate to="/" replace />;
  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!email) return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />;

  const submit = async () => {
    const token = session?.access_token;
    if (!token) return;
    setState("sending");
    setMessage("");
    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: "team",
          teamSlug,
          teamName,
          leagueSlug,
          proof,
          proposed: { note },
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        setMessage(body?.error?.message || "Could not send the request.");
        setState("error");
        return;
      }
      setState("sent");
    } catch {
      setMessage("Could not send the request.");
      setState("error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight">{teamName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Send a team information change and how it can be checked. Stats stay off this form.
      </p>
      {state === "sent" ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="font-display text-2xl font-bold">Request sent</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The note and proof are waiting for review. Team stats stay unchanged.
          </p>
        </section>
      ) : (
        <form
          className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="block text-sm">
            What should change
            <textarea className={`${fieldClassName()} min-h-28`} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <label className="block text-sm">
            Proof
            <textarea
              className={`${fieldClassName()} min-h-28`}
              placeholder="Link, team email, or how this can be checked"
              value={proof}
              onChange={(event) => setProof(event.target.value)}
            />
          </label>
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
          <button
            type="submit"
            disabled={state === "sending"}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-5 font-display text-sm font-bold uppercase tracking-tight text-primary-foreground disabled:opacity-60"
          >
            {state === "sending" ? "Sending…" : "Submit for review"}
          </button>
        </form>
      )}
    </div>
  );
}
