import { Zap } from "lucide-react";
import { PlayerSearch } from "@/components/search/PlayerSearch";

export function Hero() {
  return (
    <section className="relative z-20 flex h-[80vh] items-center justify-center overflow-visible border-b border-border/40">
      <div className="absolute inset-0 z-0 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,87,34,0.18),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black_70%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 px-4 text-center">
        <div className="mb-6 inline-flex animate-fade-in-up items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-primary">
          <Zap className="h-3 w-3" />
          <span>REAL-TIME STATS</span>
        </div>

        <h1 className="mb-6 animate-fade-in-up font-display text-7xl font-bold tracking-tighter text-foreground delay-100 md:text-9xl">
          <span
            style={{
              color: "black",
              textShadow:
                "-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, -2px 0 0 #fff, 2px 0 0 #fff, 0 -2px 0 #fff, 0 2px 0 #fff",
            }}
          >
            HOOP
          </span>
          <span className="text-glow text-primary">CENTRAL</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl animate-fade-in-up font-body text-xl text-muted-foreground delay-200 md:text-2xl">
          The ultimate database for modern basketball stats. Track performance of
          the biggest stars and hottest prospects.
        </p>

        <PlayerSearch />
      </div>
    </section>
  );
}
