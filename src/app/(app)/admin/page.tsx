import { Header } from "@/components/layout/Header";
import Link from "next/link";

const adminSections = [
  {
    title: "Employees",
    description: "Manage staff roster, job titles, offices, and departments.",
    href: "/admin/employees",
    icon: "👥",
  },
  {
    title: "Clients",
    description: "Add, edit, and archive PR clients.",
    href: "/admin/clients",
    icon: "🏢",
  },
  {
    title: "Billing Rates",
    description: "Set hourly rates per client and job title with effective dates.",
    href: "/admin/rates",
    icon: "💰",
  },
  {
    title: "Users",
    description: "Manage user accounts and role assignments.",
    href: "/admin/users",
    icon: "🔑",
  },
];

export default function AdminPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header title="Admin" subtitle="Manage master data and system settings" />

      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          {adminSections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="card p-6 hover:border-blue-200 hover:shadow-md transition-all group"
            >
              <div className="text-3xl mb-3">{s.icon}</div>
              <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                {s.title}
              </h3>
              <p className="text-sm text-slate-500 mt-1">{s.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
