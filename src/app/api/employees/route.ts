import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") !== "false";

  const employees = await prisma.employee.findMany({
    where: activeOnly ? { isActive: true } : {},
    include: {
      jobTitle: true,
      office: true,
      department: { include: { office: true } },
    },
    orderBy: [{ office: { name: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json(employees);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, jobTitleId, officeId, departmentId, startDate } = body;

  if (!name || !email || !jobTitleId) {
    return NextResponse.json({ error: "name, email, and jobTitleId are required" }, { status: 400 });
  }

  try {
    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        jobTitleId,
        officeId: officeId || null,
        departmentId: departmentId || null,
        startDate: startDate ? new Date(startDate) : null,
      },
      include: { jobTitle: true, office: true, department: true },
    });
    return NextResponse.json(employee, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
