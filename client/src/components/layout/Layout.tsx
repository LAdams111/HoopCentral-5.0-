import { Link, useLocation } from "react-router-dom";
import { Search } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const navLink = (to: string, label: string) => {
    const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
    return (
      <Link
        to={to}
        className={`px-3 py-2 text-sm font-medium uppercase tracking-wider transition-colors ${
          active
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-2xl font-bold tracking-tight text-primary md:text-3xl">
              HOOPCENTRAL
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLink("/", "Home")}
            {navLink("/players", "Players")}
          </nav>

          <Link
            to="/players"
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search Players</span>
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-16 border-t border-border/50 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6">
          <p className="font-display text-lg text-foreground/60">HOOPCENTRAL</p>
          <p className="mt-1">The ultimate database for modern basketball stats.</p>
        </div>
      </footer>
    </div>
  );
}
