import { Link, useLocation } from "react-router-dom";
import { Activity } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { PlayerSearch } from "@/components/search/PlayerSearch";

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="group flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <span className="font-display text-2xl font-bold tracking-widest text-foreground transition-colors group-hover:text-primary">
              HOOP<span className="text-primary">CENTRAL</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`text-sm font-medium uppercase tracking-wider transition-colors ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <PlayerSearch variant="header" />
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-border/30 px-4 py-2 md:hidden no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-wider ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main>{children}</main>
    </div>
  );
}
