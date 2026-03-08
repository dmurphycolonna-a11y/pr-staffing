import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { monthKey } from "@/lib/utils";

/**
 * GET /api/allocations?clientId=...&year=2025&startMonth=1&endMonth=6
 *
 * Returns the staffing grid data for a specific client and date range.
 * Includes resolved rates, per-employee capacities, and cross-client
 * total allocations for utilization warnings.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const year = parseInt(searchParams.get("year") ?? "2025");
  const startMonth = parseInt(searchParams.get("startMonth") ?? "1");
  const endMonth = parseInt(searchParams.get("endMonth") ?? "12");

  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  // Fetch allocations for this client in the period
  const allocations = await prisma.allocation.findMany({
    where: {
      clientId,
      year,
      month: { gte: startMonth, lte: endMonth },
    },
    include: {
      employee: { include: { jobTitle: true, office: true, department: true } },
    },
  });

  // Resolve the active hourly rate for each unique employee (via their job title) + this client
  const uniqueJobTitleIds = Array.from(new Set(allocations.map((a) => a.employee.jobTitleId)));

  const rates = await Promise.all(
    uniqueJobTitleIds.map((jobTitleId) =>
      prisma.clientRate.findFirst({
        where: {
          clientId,
          jobTitleId,
          effectiveFrom: { lte: new Date(year, startMonth - 1, 1) },
        },
        orderBy: { effectiveFrom: "desc" },
      })
    )
  );

  const rateByJobTitle: Record<string, number | null> = {};
  uniqueJobTitleIds.forEach((id, i) => {
    rateByJobTitle[id] = rates[i]?.hourlyRate ?? null;
  });

  // Build employee list from allocations
  const employeeMap = new Map<string, (typeof allocations)[number]["employee"]>();
  for (const alloc of allocations) {
    if (!employeeMap.has(alloc.employeeId)) {
      employeeMap.set(alloc.employeeId, alloc.employee);
    }
  }

  const employeeIds = Array.from(employeeMap.keys());

  // Fetch capacities for these employees across the period
  const capacities = await prisma.capacity.findMany({
    where: {
      employeeId: { in: employeeIds },
      year,
      month: { gte: startMonth, lte: endMonth },
    },
  });

  const capacityMap: Record<string, Record<string, number>> = {};
  for (const c of capacities) {
    if (!capacityMap[c.employeeId]) capacityMap[c.employeeId] = {};
    capacityMap[c.employeeId][monthKey(c.year, c.month)] = c.totalHours;
  }

  // Fetch ALL allocations for these employees across the period (for utilization calc)
  const allAllocations = await prisma.allocation.findMany({
    where: {
      employeeId: { in: employeeIds },
      year,
      month: { gte: startMonth, lte: endMonth },
    },
  });

  // Sum total allocated hours per employee per month across ALL clients
  const totalAllocMap: Record<string, Record<string, number>> = {};
  for (const a of allAllocations) {
    if (!totalAllocMap[a.employeeId]) totalAllocMap[a.employeeId] = {};
    const key = monthKey(a.year, a.month);
    totalAllocMap[a.employeeId][key] = (totalAllocMap[a.employeeId][key] ?? 0) + (a.plannedHours ?? 0);
  }

  // Build cells per employee
  const cellsByEmployee: Record<string, Record<string, {
    allocationId: string; plannedHours: number | null; plannedPct: number | null; plannedRevenue: number | null;
  }>> = {};

  for (const alloc of allocations) {
    if (!cellsByEmployee[alloc.employeeId]) cellsByEmployee[alloc.employeeId] = {};
    cellsByEmployee[alloc.employeeId][monthKey(alloc.year, alloc.month)] = {
      allocationId: alloc.id,
      plannedHours: alloc.plannedHours,
      plannedPct: alloc.plannedPct,
      plannedRevenue: alloc.plannedRevenue,
    };
  }

  // Assemble rows
  const rows = Array.from(employeeMap.values()).map((emp) => ({
    employee: emp,
    rate: rateByJobTitle[emp.jobTitleId] ?? null,
    cells: cellsByEmployee[emp.id] ?? {},
    capacities: capacityMap[emp.id] ?? {},
    totalAllocatedHours: totalAllocMap[emp.id] ?? {},
  }));

  return NextResponse.json({ rows });
}

/**
 * POST /api/allocations — Upsert a single allocation cell.
 * Automatically calculates plannedRevenue from the active rate.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { employeeId, clientId, year, month, plannedHours, plannedPct } = body;

  if (!employeeId || !clientId || !year || !month) {
    return NextResponse.json({ error: "employeeId, clientId, year, month are required" }, { status: 400 });
  }

  // Resolve rate
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const rate = await prisma.clientRate.findFirst({
    where: {
      clientId,
      jobTitleId: employee.jobTitleId,
      effectiveFrom: { lte: new Date(parseInt(year), parseInt(month) - 1, 1) },
    },
    orderBy: { effectiveFrom: "desc" },
  });

  const hours = plannedHours != null ? parseFloat(plannedHours) : null;
  const pct = plannedPct != null ? parseFloat(plannedPct) : null;
  const revenue = hours != null && rate ? Math.round(hours * rate.hourlyRate * 100) / 100 : null;

  const allocation = await prisma.allocation.upsert({
    where: {
      employeeId_clientId_year_month: {
        employeeId,
        clientId,
        year: parseInt(year),
        month: parseInt(month),
      },
    },
    create: {
      employeeId,
      clientId,
      year: parseInt(year),
      month: parseInt(month),
      plannedHours: hours,
      plannedPct: pct,
      plannedRevenue: revenue,
    },
    update: {
      plannedHours: hours,
      plannedPct: pct,
      plannedRevenue: revenue,
    },
  });

  return NextResponse.json(allocation);
}
