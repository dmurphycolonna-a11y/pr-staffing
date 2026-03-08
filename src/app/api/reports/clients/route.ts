import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatMonthLabel } from "@/lib/utils";
import type { ClientReportRow } from "@/types";

/**
 * GET /api/reports/clients?year=2025&startMonth=1&endMonth=6&officeId=...
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? "2025");
  const startMonth = parseInt(searchParams.get("startMonth") ?? "1");
  const endMonth = parseInt(searchParams.get("endMonth") ?? "12");
  const officeId = searchParams.get("officeId") ?? undefined;

  const clients = await prisma.client.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const clientIds = clients.map((c) => c.id);

  // Filter by office if needed (allocations link employees to clients)
  const employeeWhere = officeId ? { employee: { officeId } } : {};

  const [allocations, actuals] = await Promise.all([
    prisma.allocation.findMany({
      where: {
        clientId: { in: clientIds },
        year,
        month: { gte: startMonth, lte: endMonth },
        ...employeeWhere,
      },
    }),
    prisma.actual.findMany({
      where: {
        clientId: { in: clientIds },
        year,
        month: { gte: startMonth, lte: endMonth },
        ...employeeWhere,
      },
    }),
  ]);

  const rows: ClientReportRow[] = clients.map((client) => {
    const clientAllocs = allocations.filter((a) => a.clientId === client.id);
    const clientActuals = actuals.filter((a) => a.clientId === client.id);

    const plannedHours = clientAllocs.reduce((s, a) => s + (a.plannedHours ?? 0), 0);
    const plannedRevenue = clientAllocs.reduce((s, a) => s + (a.plannedRevenue ?? 0), 0);
    const actualHours = clientActuals.reduce((s, a) => s + (a.actualHours ?? 0), 0);
    const actualRevenue = clientActuals.reduce((s, a) => s + (a.actualRevenue ?? 0), 0);
    const actualBillings = clientActuals.reduce((s, a) => s + (a.actualBillings ?? 0), 0);

    // Unique employees on this client
    const staffCount = new Set(clientAllocs.map((a) => a.employeeId)).size;

    return {
      clientId: client.id,
      clientName: client.name,
      industry: client.industry ?? "—",
      staffCount,
      plannedHours: Math.round(plannedHours * 10) / 10,
      plannedRevenue: Math.round(plannedRevenue),
      actualHours: Math.round(actualHours * 10) / 10,
      actualRevenue: Math.round(actualRevenue),
      actualBillings: Math.round(actualBillings),
      hoursVariance: Math.round((actualHours - plannedHours) * 10) / 10,
      revenueVariance: Math.round(actualRevenue - plannedRevenue),
    };
  }).filter((r) => r.plannedHours > 0 || r.actualHours > 0);

  return NextResponse.json({ rows, period: { year, startMonth, endMonth, label: `${formatMonthLabel(year, startMonth)} – ${formatMonthLabel(year, endMonth)}` } });
}
