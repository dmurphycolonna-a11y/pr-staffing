import { Header } from "@/components/layout/Header";
import { ActualsManager } from "@/components/actuals/ActualsManager";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ActualsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [employees, clients] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      include: { jobTitle: true, office: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Actuals"
        subtitle="View, enter, or import actual hours, revenue, and billings"
      />
      <ActualsManager employees={employees} clients={clients} />
    </div>
  );
}
