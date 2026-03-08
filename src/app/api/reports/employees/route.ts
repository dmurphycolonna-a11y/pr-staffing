import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatMonthLabel } from "@/lib/utils";
import type { EmployeeReportRow } from "@/types";

/**
 * GET /api/reports/employees?year=2025&startMonth=1&endMonth=6&officeId=...&clientId=...
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

  const employees = await prisma.employee.findMany({
    where: { isActive: true, ...(officeId && { officeId }) },
    include: { jobTitle: true, office: true, department: true },
    orderBy: { name: "asc" },
  });

  const employeeIds = employees.map((e) => e.id);

  const [allocations, actuals, capacities] = await Promise.all([
    prisma.allocation.findMany({
      where: {
        employeeId: { in: employeeIds },
        year,
        month: { gte: startMonth, lte: endMonth },
        ...(clientId && { clientId }),
      },
    }),
    prisma.actual.findMany({
      where: {
        employeeId: { in: employeeIds },
        year,
        month: { gte: startMonth, lte: endMonth },
        ...(clientId && { clientId }),
      },
    }),
    prisma.capacity.findMany({
      where: { employeeId: { in: employeeIds }, year, month: { gte: startMonth, lte: endMonth } },
    }),
  ]);

  const rows: EmployeeReportRow[] = employees.map((emp) => {
    const empAllocs = allocations.filter((a) => a.employeeId === emp.id);
    const empActuals = actuals.filter((a) => a.employeeId === emp.id);
    const empCaps = capacities.filter((c) => c.employeeId === emp.id);

    const plannedHours = empAllocs.reduce((s, a) => s + (a.plannedHours ?? 0), 0);
    const plannedRevenue = empAllocs.reduce((s, a) => s + (a.plannedRevenue ?? 0), 0);
    const actualHours = empActuals.reduce((s, a) => s + (a.actualHours ?? 0), 0);
    const actualRevenue = empActuals.reduce((s, a) => s + (a.actualRevenue ?? 0), 0);
    const actualBillings = empActuals.reduce((s, a) => s + (a.actualBillings ?? 0), 0);

    // Capacity for this period: sum seeded records or default 160 × months
    const months = endMonth - startMonth + 1;
    const capacityHours = empCaps.length > 0
      ? empCaps.reduce((s, c) => s + c.totalHours, 0)
      : months * 160;

    const utilizationPct = capacityHours > 0 ? (actualHours / capacityHours) * 100 : 0;
    const avgRealizedRate = actualHours > 0 ? actualRevenue / actualHours : null;

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      jobTitle: emp.jobTitle.name,
      office: emp.office?.name ?? "—",
      department: emp.department?.name ?? "—",
      plannedHours: Math.round(plannedHours * 10) / 10,
      plannedRevenue: Math.round(plannedRevenue),
      actualHours: Math.round(actualHours * 10) / 10,
      actualRevenue: Math.round(actualRevenue),
      actualBillings: Math.round(actualBillings),
      hoursVariance: Math.round((actualHours - plannedHours) * 10) / 10,
      revenueVariance: Math.round(actualRevenue - plannedRevenue),
      capacityHours,
      utilizationPct: Math.round(utilizationPct * 10) / 10,
      avgRealizedRate: avgRealizedRate ? Math.round(avgRealizedRate * 100) / 100 : null,
    };
  }).filter((r) => r.plannedHours > 0 || r.actualHours > 0);

  return NextResponse.json({ rows, period: { year, startMonth, endMonth, label: `${formatMonthLabel(year, startMonth)} – ${formatMonthLabel(year, endMonth)}` } });
}
