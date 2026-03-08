import { format, startOfMonth } from "date-fns";

// ── Formatting ───────────────────────────────────────────────────────────────

export function formatCurrency(value: number | null | undefined, decimals = 0): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function formatHours(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}h`;
}

export function formatPct(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

export function formatMonthLabel(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), "MMM yy");
}

export function formatMonthFull(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// ── Month Range Generation ───────────────────────────────────────────────────

export interface MonthDef {
  year: number;
  month: number;
  label: string;
  key: string;
}

export function generateMonths(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): MonthDef[] {
  const months: MonthDef[] = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push({ year: y, month: m, label: formatMonthLabel(y, m), key: monthKey(y, m) });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

// ── Colour helpers for utilization ──────────────────────────────────────────

/** Returns a Tailwind text-colour class based on utilization percentage */
export function utilizationColour(pct: number): string {
  if (pct > 100) return "text-red-600";
  if (pct >= 90) return "text-amber-600";
  if (pct >= 60) return "text-green-600";
  return "text-slate-500";
}

/** Returns a Tailwind bg-colour class for utilization bars */
export function utilizationBgColour(pct: number): string {
  if (pct > 100) return "bg-red-500";
  if (pct >= 90) return "bg-amber-500";
  if (pct >= 60) return "bg-green-500";
  return "bg-slate-300";
}

/** Returns a Tailwind text-colour class for plan-vs-actual variance */
export function varianceColour(variance: number): string {
  if (variance < -10) return "text-red-600";
  if (variance > 10) return "text-green-600";
  return "text-slate-600";
}

// ── Misc ─────────────────────────────────────────────────────────────────────

export function clsx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Round to 2 decimal places */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Current year and month */
export function currentPeriod(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");
}
