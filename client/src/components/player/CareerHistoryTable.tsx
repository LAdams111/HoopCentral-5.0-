import type { CareerEntry } from "@/lib/api";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function CareerHistoryTable({ career }: { career: CareerEntry[] }) {
  if (career.length === 0) {
    return (
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="border-b border-border p-6">
          <h3 className="font-display text-2xl">Career History</h3>
        </div>
        <div className="p-6 text-center text-sm text-muted-foreground">
          No career history available.
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <div className="border-b border-border p-6">
        <h3 className="font-display text-2xl">Career History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted font-mono text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-medium">Season</th>
              <th className="px-6 py-4 font-medium">League</th>
              <th className="px-6 py-4 font-medium">Team</th>
              <th className="px-6 py-4 font-medium">Start</th>
              <th className="px-6 py-4 font-medium">End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {career.map((entry) => (
              <tr key={entry.id} className="transition-colors hover:bg-muted/50">
                <td className="px-6 py-4 font-mono font-medium">{entry.season}</td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-muted-foreground">
                  {entry.league}
                </td>
                <td className="px-6 py-4 font-mono">
                  <span className="whitespace-nowrap text-primary">{entry.team}</span>
                </td>
                <td className="px-6 py-4 font-mono text-muted-foreground">
                  {formatDate(entry.startDate)}
                </td>
                <td className="px-6 py-4 font-mono text-muted-foreground">
                  {formatDate(entry.endDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
