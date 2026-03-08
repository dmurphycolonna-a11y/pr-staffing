import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const clientId = searchParams.get("clientId");
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const actuals = await prisma.actual.findMany({
    where: {
      ...(employeeId && { employeeId }),
      ...(clientId && { clientId }),
      ...(year && { year: parseInt(year) }),
      ...(month && { month: parseInt(month) }),
    },
    include: {
      employee: { include: { jobTitle: true, office: true } },
      client: true,
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { employee: { name: "asc" } }],
  });

  return NextResponse.json(actuals);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { employeeId, clientId, year, month, actualHours, actualRevenue, actualBillings } = body;

  if (!employeeId || !clientId || !year || !month) {
    return NextResponse.json({ error: "employeeId, clientId, year, month are required" }, { status: 400 });
  }

  const actual = await prisma.actual.upsert({
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
      actualHours: actualHours != null ? parseFloat(actualHours) : null,
      actualRevenue: actualRevenue != null ? parseFloat(actualRevenue) : null,
      actualBillings: actualBillings != null ? parseFloat(actualBillings) : null,
      source: "manual",
    },
    update: {
      actualHours: actualHours != null ? parseFloat(actualHours) : null,
      actualRevenue: actualRevenue != null ? parseFloat(actualRevenue) : null,
      actualBillings: actualBillings != null ? parseFloat(actualBillings) : null,
    },
  });

  return NextResponse.json(actual);
}
