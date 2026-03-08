import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const year = searchParams.get("year");

  const capacity = await prisma.capacity.findMany({
    where: {
      ...(employeeId && { employeeId }),
      ...(year && { year: parseInt(year) }),
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  return NextResponse.json(capacity);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { employeeId, year, month, totalHours } = body;

  const capacity = await prisma.capacity.upsert({
    where: { employeeId_year_month: { employeeId, year: parseInt(year), month: parseInt(month) } },
    create: { employeeId, year: parseInt(year), month: parseInt(month), totalHours: parseFloat(totalHours) },
    update: { totalHours: parseFloat(totalHours) },
  });

  return NextResponse.json(capacity);
}
