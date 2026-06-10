import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 md:pb-24 md:pt-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <p className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Real-Time Stats
        </p>
        <h1 className="font-display text-5xl font-bold leading-[0.85] tracking-tighter text-foreground md:text-8xl lg:text-9xl">
          <span className="text-glow text-primary">HOOP</span>
          <br />
          CENTRAL
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
          The ultimate database for modern basketball stats. Track performance of
          the biggest stars and hottest prospects.
        </p>
        <Link
          to="/players"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Browse Players
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
