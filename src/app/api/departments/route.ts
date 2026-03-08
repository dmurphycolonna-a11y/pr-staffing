import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const officeId = searchParams.get("officeId");

  const departments = await prisma.department.findMany({
    where: officeId ? { officeId } : {},
    include: { office: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(departments);
}
