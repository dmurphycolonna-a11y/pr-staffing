import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatMonthLabel, monthKey } from "@/lib/utils";

/**
 * GET /api/reports/summary?year=2025&month=3
 * Returns dashboard KPIs and recent monthly trends.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));

  const [activeEmployees, activeClients, monthAllocations, monthActuals, allCapacity, recentAllocations, recentActuals] =
    await Promise.all([
      prisma.employee.count({ where: { isActive: true } }),
      prisma.client.count({ where: { isActive: true } }),
      // Current month plan
      prisma.allocation.findMany({ where: { year, month } }),
      // Current month actuals
      prisma.actual.findMany({ where: { year, month } }),
      // Capacity for current month
      prisma.capacity.findMany({ where: { year, month } }),
      // Last 6 months allocations for trend
      prisma.allocation.findMany({
        where: {
          OR: Array.from({ length: 6 }, (_, i) => {
            const d = new Date(year, month - 1 - i, 1);
            return { year: d.getFullYear(), month: d.getMonth() + 1 };
          }),
        },
      }),
      // Last 6 months actuals for trend
      prisma.actual.findMany({
        where: {
          OR: Array.from({ length: 6 }, (_, i) => {
            const d = new Date(year, month - 1 - i, 1);
            return { year: d.getFullYear(), month: d.getMonth() + 1 };
          }),
        },
      }),
    ]);

  const totalPlannedHours = monthAllocations.reduce((s, a) => s + (a.plannedHours ?? 0), 0);
  const totalPlannedRevenue = monthAllocations.reduce((s, a) => s + (a.plannedRevenue ?? 0), 0);
  const totalActualHours = monthActuals.reduce((s, a) => s + (a.actualHours ?? 0), 0);
  const totalActualRevenue = monthActuals.reduce((s, a) => s + (a.actualRevenue ?? 0), 0);
  const totalCapacity = allCapacity.reduce((s, c) => s + c.totalHours, 0) || activeEmployees * 160;
  const utilizationPct = totalCapacity > 0 ? (totalActualHours / totalCapacity) * 100 : 0;

  // Count over-allocated employees (total planned > capacity)
  const employeeAllocTotals: Record<string, number> = {};
  for (const a of monthAllocations) {
    employeeAllocTotals[a.employeeId] = (employeeAllocTotals[a.employeeId] ?? 0) + (a.plannedHours ?? 0);
  }
  const capacityByEmployee: Record<string, number> = {};
  for (const c of allCapacity) capacityByEmployee[c.employeeId] = c.totalHours;

  const overAllocatedCount = Object.entries(employeeAllocTotals).filter(
    ([empId, total]) => total > (capacityByEmployee[empId] ?? 160)
  ).length;

  // Recent months trend (last 6)
  const recentMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, month - 1 - (5 - i), 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = monthKey(y, m);
    const allocs = recentAllocations.filter((a) => a.year === y && a.month === m);
    const acts = recentActuals.filter((a) => a.year === y && a.month === m);
    const plannedHours = allocs.reduce((s, a) => s + (a.plannedHours ?? 0), 0);
    const plannedRevenue = allocs.reduce((s, a) => s + (a.plannedRevenue ?? 0), 0);
    const actualHours = acts.reduce((s, a) => s + (a.actualHours ?? 0), 0);
    const actualRevenue = acts.reduce((s, a) => s + (a.actualRevenue ?? 0), 0);
    return { year: y, month: m, label: formatMonthLabel(y, m), key, plannedHours, plannedRevenue, actualHours, actualRevenue };
  });

  // Top 5 clients by planned revenue this month
  const clientTotals: Record<string, { clientId: string; plannedRevenue: number; plannedHours: number }> = {};
  for (const a of monthAllocations) {
    if (!clientTotals[a.clientId]) clientTotals[a.clientId] = { clientId: a.clientId, plannedRevenue: 0, plannedHours: 0 };
    clientTotals[a.clientId].plannedRevenue += a.plannedRevenue ?? 0;
    clientTotals[a.clientId].plannedHours += a.plannedHours ?? 0;
  }
  const clientIds = Object.keys(clientTotals);
  const clientNames = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true },
  });
  const nameById: Record<string, string> = {};
  for (const c of clientNames) nameById[c.id] = c.name;

  const topClients = Object.values(clientTotals)
    .sort((a, b) => b.plannedRevenue - a.plannedRevenue)
    .slice(0, 5)
    .map((c) => ({ ...c, clientName: nameById[c.clientId] ?? "Unknown" }));

  return NextResponse.json({
    currentMonth: { year, month, label: formatMonthLabel(year, month) },
    activeEmployees,
    activeClients,
    totalPlannedHours,
    totalPlannedRevenue,
    totalActualHours,
    totalActualRevenue,
    utilizationPct: Math.round(utilizationPct * 10) / 10,
    overAllocatedCount,
    recentMonths,
    topClients,
  });
}
