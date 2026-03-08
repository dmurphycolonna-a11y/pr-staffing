import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, code, industry, contactName, isActive } = body;

  const client = await prisma.client.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(code !== undefined && { code: code.toUpperCase() }),
      ...(industry !== undefined && { industry }),
      ...(contactName !== undefined && { contactName }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(client);
}
