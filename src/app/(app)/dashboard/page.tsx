"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatHours, formatPct, utilizationColour, utilizationBgColour } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from "recharts";

interface DashboardData {
  currentMonth: { year: number; month: number; label: string };
  activeEmployees: number;
  activeClients: number;
  totalPlannedHours: number;
  totalPlannedRevenue: number;
  totalActualHours: number;
  totalActualRevenue: number;
  utilizationPct: number;
  overAllocatedCount: number;
  recentMonths: Array<{
    label: string;
    plannedHours: number;
    actualHours: number;
    plannedRevenue: number;
    actualRevenue: number;
  }>;
  topClients: Array<{
    clientId: string;
    clientName: string;
    plannedRevenue: number;
    plannedHours: number;
  }>;
}

function KPICard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`card p-5 ${accent ? "bg-blue-700 text-white border-blue-600" : ""}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? "text-blue-200" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`text-2xl font-bold mt-1 ${accent ? "text-white" : "text-slate-900"}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? "text-blue-200" : "text-slate-400"}`}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    fetch(`/api/reports/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col flex-1">
      <Header title="Dashboard" subtitle="Staffing & capacity overview" />
      <PageLoader />
    </div>
  );

  if (!data) return (
    <div className="flex flex-col flex-1">
      <Header title="Dashboard" />
      <div className="p-6 text-slate-500">Failed to load dashboard data.</div>
    </div>
  );

  const hoursVariancePct = data.totalPlannedHours > 0
    ? ((data.totalActualHours - data.totalPlannedHours) / data.totalPlannedHours) * 100
    : 0;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Dashboard"
        subtitle={`Staffing overview · ${data.currentMonth.label}`}
      />

      <main className="flex-1 p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Active Employees" value={String(data.activeEmployees)} />
          <KPICard label="Active Clients" value={String(data.activeClients)} />
          <KPICard
            label="Utilization"
            value={formatPct(data.utilizationPct)}
            sub={`${data.overAllocatedCount} over-allocated`}
            accent={data.utilizationPct > 85}
          />
          <KPICard
            label="Hours Variance"
            value={`${hoursVariancePct >= 0 ? "+" : ""}${hoursVariancePct.toFixed(1)}%`}
            sub={`${formatHours(data.totalActualHours)} actual vs ${formatHours(data.totalPlannedHours)} planned`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <KPICard
            label={`Planned Revenue · ${data.currentMonth.label}`}
            value={formatCurrency(data.totalPlannedRevenue)}
          />
          <KPICard
            label={`Actual Revenue · ${data.currentMonth.label}`}
            value={formatCurrency(data.totalActualRevenue)}
            sub={`${formatCurrency(data.totalActualRevenue - data.totalPlannedRevenue)} variance`}
          />
        </div>

        {/* Over-allocation alert */}
        {data.overAllocatedCount > 0 && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              <strong>{data.overAllocatedCount} employee{data.overAllocatedCount > 1 ? "s are" : " is"} over-allocated</strong> this month.
              Check the Staffing Plan to resolve conflicts.
            </span>
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Monthly Hours Trend */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Hours — Plan vs Actual</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.recentMonths} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v: number) => [`${v.toFixed(0)}h`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="plannedHours" name="Planned" fill="#bfdbfe" radius={[3, 3, 0, 0]} />
                <Bar dataKey="actualHours" name="Actual" fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Revenue Trend */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Revenue — Plan vs Actual</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.recentMonths} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v: number) => [`$${(v / 1000).toFixed(1)}k`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="plannedRevenue" name="Planned" stroke="#bfdbfe" strokeWidth={2} dot={false} />
                <Line dataKey="actualRevenue" name="Actual" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top clients */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">
              Top Clients by Planned Revenue · {data.currentMonth.label}
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {data.topClients.map((c) => {
              const maxRevenue = Math.max(...data.topClients.map((x) => x.plannedRevenue));
              const barPct = maxRevenue > 0 ? (c.plannedRevenue / maxRevenue) * 100 : 0;
              return (
                <div key={c.clientId} className="px-5 py-3 flex items-center gap-4">
                  <div className="w-40 text-sm text-slate-700 font-medium truncate">{c.clientName}</div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-700 w-24 text-right">
                    {formatCurrency(c.plannedRevenue)}
                  </div>
                  <div className="text-xs text-slate-400 w-16 text-right">
                    {formatHours(c.plannedHours)}
                  </div>
                </div>
              );
            })}
            {data.topClients.length === 0 && (
              <p className="px-5 py-4 text-sm text-slate-400">No data for this month.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
