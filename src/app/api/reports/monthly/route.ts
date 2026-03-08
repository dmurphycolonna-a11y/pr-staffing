import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatMonthLabel } from "@/lib/utils";
import type { MonthlyReportRow } from "@/types";

/**
 * GET /api/reports/monthly?year=2025&startMonth=1&endMonth=6&officeId=...&clientId=...
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? "2025");
  const startMonth = parseInt(searchParams.get("startMonth") ?? "1");
  const endMonth = parseInt(searchParams.get("endMonth") ?? "12");
  const officeId = searchParams.get("officeId") ?? undefined;
  const clientId = searchParams.get("clientId") ?? undefined;

  const employeeWhere = officeId ? { employee: { officeId } } : {};

  const [allocations, actuals, capacities] = await Promise.all([
    prisma.allocation.findMany({
      where: {
        year,
        month: { gte: startMonth, lte: endMonth },
        ...(clientId && { clientId }),
        ...employeeWhere,
      },
    }),
    prisma.actual.findMany({
      where: {
        year,
        month: { gte: startMonth, lte: endMonth },
        ...(clientId && { clientId }),
        ...employeeWhere,
      },
    }),
    prisma.capacity.findMany({
      where: {
        year,
        month: { gte: startMonth, lte: endMonth },
        ...(officeId && { employee: { officeId } }),
      },
    }),
  ]);

  const rows: MonthlyReportRow[] = Array.from({ length: endMonth - startMonth + 1 }, (_, i) => {
    const m = startMonth + i;
    const monthAllocs = allocations.filter((a) => a.month === m);
    const monthActuals = actuals.filter((a) => a.month === m);
    const monthCaps = capacities.filter((c) => c.month === m);

    const plannedHours = monthAllocs.reduce((s, a) => s + (a.plannedHours ?? 0), 0);
    const plannedRevenue = monthAllocs.reduce((s, a) => s + (a.plannedRevenue ?? 0), 0);
    const actualHours = monthActuals.reduce((s, a) => s + (a.actualHours ?? 0), 0);
    const actualRevenue = monthActuals.reduce((s, a) => s + (a.actualRevenue ?? 0), 0);
    const actualBillings = monthActuals.reduce((s, a) => s + (a.actualBillings ?? 0), 0);
    const capacityHours = monthCaps.reduce((s, c) => s + c.totalHours, 0);
    const utilizationPct = capacityHours > 0 ? (actualHours / capacityHours) * 100 : 0;

    return {
      year,
      month: m,
      label: formatMonthLabel(year, m),
      plannedHours: Math.round(plannedHours * 10) / 10,
      plannedRevenue: Math.round(plannedRevenue),
      actualHours: Math.round(actualHours * 10) / 10,
      actualRevenue: Math.round(actualRevenue),
      actualBillings: Math.round(actualBillings),
      hoursVariance: Math.round((actualHours - plannedHours) * 10) / 10,
      revenueVariance: Math.round(actualRevenue - plannedRevenue),
      capacityHours,
      utilizationPct: Math.round(utilizationPct * 10) / 10,
    };
  });

  return NextResponse.json({ rows, period: { year, startMonth, endMonth, label: `${formatMonthLabel(year, startMonth)} – ${formatMonthLabel(year, endMonth)}` } });
}
