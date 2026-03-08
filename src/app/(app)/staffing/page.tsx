import { Header } from "@/components/layout/Header";
import { StaffingGrid } from "@/components/staffing/StaffingGrid";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function StaffingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Fetch master data server-side for initial render
  const [clients, employees] = await Promise.all([
    prisma.client.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { isActive: true },
      include: { jobTitle: true, office: true, department: { include: { office: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Staffing Plan"
        subtitle="Enter and manage monthly allocations by client and employee"
      />
      <StaffingGrid clients={clients} allEmployees={employees} />
    </div>
  );
}
