import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, jobTitleId, officeId, departmentId, startDate, isActive } = body;

  try {
    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(jobTitleId !== undefined && { jobTitleId }),
        ...(officeId !== undefined && { officeId: officeId || null }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { jobTitle: true, office: true, department: true },
    });
    return NextResponse.json(employee);
  } catch {
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Soft delete — preserve historical allocation and actual data
  await prisma.employee.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
