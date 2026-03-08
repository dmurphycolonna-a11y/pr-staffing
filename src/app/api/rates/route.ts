import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  const rates = await prisma.clientRate.findMany({
    where: clientId ? { clientId } : {},
    include: { client: true, jobTitle: true },
    orderBy: [{ client: { name: "asc" } }, { jobTitle: { level: "desc" } }, { effectiveFrom: "desc" }],
  });

  return NextResponse.json(rates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { clientId, jobTitleId, hourlyRate, effectiveFrom, effectiveTo } = body;

  if (!clientId || !jobTitleId || !hourlyRate || !effectiveFrom) {
    return NextResponse.json({ error: "clientId, jobTitleId, hourlyRate, effectiveFrom are required" }, { status: 400 });
  }

  try {
    const rate = await prisma.clientRate.create({
      data: {
        clientId,
        jobTitleId,
        hourlyRate: parseFloat(hourlyRate),
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      },
      include: { client: true, jobTitle: true },
    });
    return NextResponse.json(rate, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Rate already exists for this client/title/date" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create rate" }, { status: 500 });
  }
}
