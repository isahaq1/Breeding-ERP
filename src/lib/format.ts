// Small formatting helpers. Using a fixed "today" keeps the demo deterministic.
export const TODAY = new Date("2026-06-07T00:00:00Z");

const MONTHS_SHORT = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

// Formats an ISO date string deterministically (no locale/ICU dependency)
// so server and client always produce identical text.
export function formatDate(iso: string): string {
  if (!iso || iso === "—") return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function ageFrom(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const months =
    (TODAY.getUTCFullYear() - d.getUTCFullYear()) * 12 +
    (TODAY.getUTCMonth() - d.getUTCMonth());
  if (months < 24) return `${months} mo`;
  return `${Math.floor(months / 12)} yr`;
}

export function daysUntil(iso: string): number {
  const d = new Date(iso + "T00:00:00Z");
  return Math.round((d.getTime() - TODAY.getTime()) / 86_400_000);
}

export function currency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function number(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
