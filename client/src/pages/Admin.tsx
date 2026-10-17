import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function Admin() {
  const { ready, email, isAdmin, adminChecked } = useAuth();

  if (!ready || (email && !adminChecked)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!email) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-24">
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Private</p>
        <h1 className="mb-8 font-display text-4xl font-bold tracking-tight">
          Admin
        </h1>
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-wide">Claim requests</h2>
          <p className="text-sm text-muted-foreground">
            Player and parent claim requests will show up here for you to approve or deny. This page is only on your account.
          </p>
          <Link
            to="/profile"
            className="mt-6 inline-flex rounded-xl border border-border px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            Back to profile
          </Link>
        </section>
      </div>
    </div>
  );
}
