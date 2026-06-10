import { Link, useLocation } from "react-router-dom";
import { Search, Trophy } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const isActive = (href: string) =>
    href === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(href);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-14 md:pb-0">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="group flex cursor-pointer items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary transition-transform duration-300 group-hover:rotate-12">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-2xl font-bold tracking-widest text-foreground transition-colors group-hover:text-primary">
              HOOP<span className="text-primary">CENTRAL</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`relative py-1 text-sm font-medium uppercase tracking-wide transition-colors hover:text-primary ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 h-0.5 w-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/players">
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                aria-label="Search players"
              >
                <Search className="h-5 w-5" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
        <div className="flex h-14 items-center justify-around">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
