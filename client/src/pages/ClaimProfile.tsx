import { useQuery } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

function PhotoPicker({
  label,
  hint,
  fileName,
  onFile,
}: {
  label: string;
  hint?: string;
  fileName: string;
  onFile: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="text-sm">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-2 flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 px-4 py-5 text-left text-primary"
      >
        <Camera className="h-7 w-7 shrink-0" />
        <span>
          <span className="block font-display text-sm font-bold uppercase tracking-tight">
            {fileName || "Upload or take a photo"}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">Tap to choose a picture or use the camera</span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
      />
      {hint ? <span className="mt-2 block text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

function shown(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  if (!text || text === "—" || text === "-") return "";
  return text;
}

type WheelOption = { value: string; label: string };

const BLANK: WheelOption = { value: "", label: "—" };

const POSITION_OPTIONS: WheelOption[] = [
  BLANK,
  ...["PG", "SG", "G", "SF", "PF", "F", "C", "G/F", "F/C"].map((value) => ({ value, label: value })),
];

const HEIGHT_OPTIONS: WheelOption[] = [
  BLANK,
  ...Array.from({ length: 39 }, (_, index) => {
    const total = 58 + index;
    const label = `${Math.floor(total / 12)}'${total % 12}"`;
    return { value: label, label };
  }),
];

const WEIGHT_OPTIONS: WheelOption[] = [
  BLANK,
  ...Array.from({ length: 301 }, (_, index) => {
    const label = `${100 + index} lbs`;
    return { value: label, label };
  }),
];

const MONTH_OPTIONS: WheelOption[] = [
  BLANK,
  ...["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(
    (label, index) => ({ value: String(index + 1).padStart(2, "0"), label }),
  ),
];

const DAY_OPTIONS: WheelOption[] = [
  BLANK,
  ...Array.from({ length: 31 }, (_, index) => {
    const value = String(index + 1).padStart(2, "0");
    return { value, label: value };
  }),
];

const YEAR_OPTIONS: WheelOption[] = [
  BLANK,
  ...Array.from({ length: 2018 - 1950 + 1 }, (_, index) => {
    const value = String(2018 - index);
    return { value, label: value };
  }),
];

function fieldClassName() {
  return "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function splitDate(value: string): { year: string; month: string; day: string } {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { year: "", month: "", day: "" };
  return { year: match[1], month: match[2], day: match[3] };
}

function joinDate(year: string, month: string, day: string): string {
  if (!year || !month || !day) return "";
  const max = daysInMonth(Number(year), Number(month));
  const safeDay = String(Math.min(Number(day), max)).padStart(2, "0");
  return `${year}-${month}-${safeDay}`;
}

function ScrollWheel({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: WheelOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const chosen = useRef(value);

  useEffect(() => {
    chosen.current = value;
    const el = scroller.current;
    if (!el) return;
    const index = Math.max(0, options.findIndex((option) => option.value === value));
    const top = index * 36;
    if (Math.abs(el.scrollTop - top) > 1) el.scrollTop = top;
  }, [options, value]);

  const chooseFromScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / 36);
    const next = options[Math.min(options.length - 1, Math.max(0, index))];
    if (!next || next.value === chosen.current) return;
    chosen.current = next.value;
    onChange(next.value);
  };

  return (
    <div className="min-w-0 text-sm">
      <span>{label}</span>
      <div className="relative mt-1 h-[108px] overflow-hidden rounded-xl border border-border bg-background">
        <div className="pointer-events-none absolute inset-x-1 top-9 z-10 h-9 rounded-lg border border-primary/30 bg-primary/10" />
        <div
          ref={scroller}
          onScroll={chooseFromScroll}
          className="h-full snap-y snap-mandatory overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="h-9" />
          {options.map((option) => (
            <button
              key={`${label}-${option.value || "blank"}`}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex h-9 w-full snap-center items-center justify-center px-2 text-sm ${
                option.value === value ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
          <div className="h-9" />
        </div>
      </div>
    </div>
  );
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
  const playerRequest = params.get("edit") === "player" ? "edit" : params.get("claim") === "player" ? "claim" : null;
  const allowed = playerRequest !== null && Number.isInteger(playerId) && playerId > 0;
  const nextPath = `/players/${playerId}/claim?${playerRequest ?? "claim"}=player`;
  const playerQuery = useQuery({
    queryKey: ["claim-player", playerId],
    enabled: allowed,
    queryFn: () => getPlayer(playerId),
  });
  const [form, setForm] = useState<PlayerForm>(EMPTY_FORM);
  const [birth, setBirth] = useState({ year: "", month: "", day: "" });
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
    setBirth(splitDate(player.birthDate?.slice(0, 10) ?? ""));
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

  if (!email && playerRequest === "edit") {
    const signup = `/login?mode=signup&next=${encodeURIComponent(nextPath)}`;
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <Link to={`/players/${playerId}`} className="font-mono text-xs uppercase tracking-wide text-primary">
          Back to profile
        </Link>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight">
          Create a profile to submit a change
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Anyone can start a change request. Sending height, weight, position, or birth date needs an account.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={signup}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-5 font-display text-sm font-bold uppercase tracking-tight text-primary-foreground"
          >
            Create account
          </Link>
          <Link
            to={`/login?next=${encodeURIComponent(nextPath)}`}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-border px-5 font-display text-sm font-bold uppercase tracking-tight"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (!email) {
    return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />;
  }

  const set = (key: keyof PlayerForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setBirthPart = (part: "year" | "month" | "day", value: string) => {
    setBirth((current) => {
      const next = { ...current, [part]: value };
      if (next.year && next.month && next.day) {
        const max = daysInMonth(Number(next.year), Number(next.month));
        if (Number(next.day) > max) next.day = String(max).padStart(2, "0");
      }
      return next;
    });
  };

  const submit = async () => {
    const token = session?.access_token;
    if (!token) return;
    if (playerRequest === "claim" && !photoFile) {
      setMessage("Upload a photo of a government-issued ID.");
      setState("error");
      return;
    }
    setState("sending");
    setMessage("");
    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          playerRequest === "claim"
            ? { kind: "identity", playerId, proof: form.proof }
            : {
                kind: "player",
                playerId,
                proof: form.proof,
                proposed: {
                  position: form.position,
                  height: form.height,
                  weight: form.weight,
                  hometown: form.hometown,
                  country: form.country,
                  birthDate: joinDate(birth.year, birth.month, birth.day),
                  jerseyNumber: form.jerseyNumber,
                  bio: form.bio,
                },
              },
        ),
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
        const uploaded = await fetch(playerRequest === "claim" ? `/api/claims/${saved.id}/id` : `/api/claims/${saved.id}/photo`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "image/jpeg",
          },
          body: photo,
        });
        if (!uploaded.ok) {
          setMessage(
            playerRequest === "claim"
              ? "The claim was saved, but the ID photo did not upload. Submit again with the photo."
              : "The request was saved, but the photo did not upload. Submit again to retry the photo.",
          );
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

  const choosePhoto = (file: File | null) => {
    setPhotoFile(file);
    setPhotoPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : "";
    });
  };

  const player = playerQuery.data;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        to={playerRequest === "edit" ? `/players/${playerId}` : `/players/${playerId}?claim=player`}
        className="font-mono text-xs uppercase tracking-wide text-primary"
      >
        Back to profile
      </Link>
      <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight">
        {playerRequest === "claim" ? "Claim this player" : "Request an edit"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {player?.name ? `${player.name}. ` : ""}
        {playerRequest === "claim"
          ? "Upload a photo of a government-issued ID to claim this profile as yours. This does not change height, weight, or stats."
          : "Send the height, weight, position, birth date, or bio that should be checked. Stats stay off this form."}
      </p>

      {state === "sent" ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="font-display text-2xl font-bold">Request sent</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {playerRequest === "claim"
              ? "The ID is waiting for review. Approving the claim does not change the public profile."
              : "The changes are waiting for review. Approving them updates the profile. Stats stay unchanged."}
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
          {playerRequest === "claim" ? (
            <PhotoPicker
              label="Government-issued ID"
              fileName={photoFile?.name ?? ""}
              hint="Photo of a passport, driver’s license, or other government ID. It is only shown on the admin review page."
              onFile={choosePhoto}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <ScrollWheel label="Position" options={POSITION_OPTIONS} value={form.position} onChange={(value) => set("position", value)} />
                <ScrollWheel label="Height" options={HEIGHT_OPTIONS} value={form.height} onChange={(value) => set("height", value)} />
                <ScrollWheel label="Weight" options={WEIGHT_OPTIONS} value={form.weight} onChange={(value) => set("weight", value)} />
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
              <div>
                <p className="text-sm">Birth date</p>
                <div className="mt-1 grid grid-cols-3 gap-3">
                  <ScrollWheel label="Month" options={MONTH_OPTIONS} value={birth.month} onChange={(month) => setBirthPart("month", month)} />
                  <ScrollWheel label="Day" options={DAY_OPTIONS} value={birth.day} onChange={(day) => setBirthPart("day", day)} />
                  <ScrollWheel label="Year" options={YEAR_OPTIONS} value={birth.year} onChange={(year) => setBirthPart("year", year)} />
                </div>
              </div>
              <label className="block text-sm">
                Jersey
                <input className={fieldClassName()} value={form.jerseyNumber} onChange={(event) => set("jerseyNumber", event.target.value)} />
              </label>
              <label className="block text-sm">
                Bio
                <textarea
                  className={`${fieldClassName()} min-h-28`}
                  placeholder="Awards, achievements, history, stories, and anything else worth knowing"
                  value={form.bio}
                  onChange={(event) => set("bio", event.target.value)}
                />
              </label>
              <PhotoPicker label="Photo" fileName={photoFile?.name ?? ""} onFile={choosePhoto} />
            </>
          )}
          {photoPreview ? (
            <img
              src={photoPreview}
              alt=""
              className={playerRequest === "claim" ? "max-h-48 rounded-xl object-contain" : "h-32 w-32 rounded-xl object-cover"}
            />
          ) : null}
          <label className="block text-sm">
            {playerRequest === "claim" ? "Note" : "Proof"}
            <textarea
              className={`${fieldClassName()} min-h-28`}
              placeholder={
                playerRequest === "claim"
                  ? "Optional. Say if you are the player, a parent, or a coach."
                  : "Link, team email, or how this can be checked"
              }
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
            {state === "sending" ? "Sending…" : playerRequest === "claim" ? "Submit claim" : "Submit for review"}
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
  const allowed = (params.get("claim") === "team" || params.get("edit") === "team") && teamSlug.length > 0;
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
