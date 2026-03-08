"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { formatCurrency, formatHours, formatPct, utilizationColour, utilizationBgColour, varianceColour, buildCsv } from "@/lib/utils";
import type { MonthlyReportRow } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ReferenceLine,
} from "recharts";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
function monthName(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "long" });
}

export default function MonthlyReportPage() {
  const [year, setYear] = useState(2025);
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(6);
  const [rows, setRows] = useState<MonthlyReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadReport() {
    setLoading(true);
    const params = new URLSearchParams({ year: String(year), startMonth: String(startMonth), endMonth: String(endMonth) });
    const data = await fetch(`/api/reports/monthly?${params}`).then((r) => r.json());
    setRows(data.rows ?? []);
    setLoading(false);
    setLoaded(true);
  }

  function exportCsv() {
    const headers = ["Month", "Planned Hours", "Actual Hours", "Hours Variance", "Capacity Hours", "Utilization %", "Planned Revenue", "Actual Revenue", "Revenue Variance", "Actual Billings"];
    const csvRows = rows.map((r) => [r.label, r.plannedHours, r.actualHours, r.hoursVariance, r.capacityHours, r.utilizationPct, r.plannedRevenue, r.actualRevenue, r.revenueVariance, r.actualBillings]);
    const blob = new Blob([buildCsv(headers, csvRows)], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `monthly-report-${year}.csv`; a.click();
  }

  const hasActuals = rows.some((r) => r.actualHours > 0);

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Monthly Report"
        subtitle="Aggregate staffing and revenue by month"
        actions={loaded && rows.length > 0 ? <button className="btn-secondary text-sm" onClick={exportCsv}>Export CSV</button> : undefined}
      />

      <main className="flex-1 p-6 space-y-5">
        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-4 items-end">
          <div className="w-24">
            <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
            <select className="input-base" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <select className="input-base" value={startMonth} onChange={(e) => setStartMonth(parseInt(e.target.value))}>
              {MONTHS.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <select className="input-base" value={endMonth} onChange={(e) => setEndMonth(parseInt(e.target.value))}>
              {MONTHS.filter((m) => m >= startMonth).map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={loadReport}>Run Report</button>
        </div>

        {loading && <PageLoader />}

        {!loading && loaded && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Planned Hrs</p>
                <p className="text-2xl font-bold mt-1">{formatHours(rows.reduce((s, r) => s + r.plannedHours, 0))}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Actual Hrs</p>
                <p className="text-2xl font-bold mt-1">
                  {hasActuals ? formatHours(rows.reduce((s, r) => s + r.actualHours, 0)) : <span className="text-slate-300">No actuals</span>}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Planned Revenue</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(rows.reduce((s, r) => s + r.plannedRevenue, 0), 0)}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Actual Revenue</p>
                <p className="text-2xl font-bold mt-1">
                  {hasActuals ? formatCurrency(rows.reduce((s, r) => s + r.actualRevenue, 0), 0) : <span className="text-slate-300">No actuals</span>}
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Hours — Plan vs Actual</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => [`${v.toFixed(0)}h`]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="plannedHours" name="Planned" fill="#bfdbfe" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="actualHours" name="Actual" fill="#2563eb" radius={[3, 3, 0, 0]} />
                    {rows[0]?.capacityHours > 0 && (
                      <Bar dataKey="capacityHours" name="Capacity" fill="#f1f5f9" radius={[3, 3, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Revenue — Plan vs Actual</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => [`$${(v / 1000).toFixed(1)}k`]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line dataKey="plannedRevenue" name="Planned" stroke="#bfdbfe" strokeWidth={2} dot={false} />
                    <Line dataKey="actualRevenue" name="Actual" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Utilization bars */}
            {rows.some((r) => r.capacityHours > 0) && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Utilization</h3>
                <div className="space-y-3">
                  {rows.map((r) => (
                    <div key={r.label} className="flex items-center gap-3 text-sm">
                      <div className="w-16 text-xs text-slate-500">{r.label}</div>
                      <div className="flex-1 h-3 rounded-full bg-slate-100">
                        <div
                          className={`h-3 rounded-full transition-all ${utilizationBgColour(r.utilizationPct)}`}
                          style={{ width: `${Math.min(r.utilizationPct, 100)}%` }}
                        />
                      </div>
                      <div className={`w-14 text-right text-xs font-semibold ${utilizationColour(r.utilizationPct)}`}>
                        {r.utilizationPct > 0 ? formatPct(r.utilizationPct) : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Table */}
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="table-th">Month</th>
                    <th className="table-th text-right">Plan Hrs</th>
                    <th className="table-th text-right">Actual Hrs</th>
                    <th className="table-th text-right">Hrs Δ</th>
                    <th className="table-th text-right">Capacity</th>
                    <th className="table-th text-right">Util %</th>
                    <th className="table-th text-right">Plan Rev</th>
                    <th className="table-th text-right">Actual Rev</th>
                    <th className="table-th text-right">Rev Δ</th>
                    <th className="table-th text-right">Billings</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className="table-tr">
                      <td className="table-td font-medium">{r.label}</td>
                      <td className="table-td text-right font-mono">{formatHours(r.plannedHours)}</td>
                      <td className="table-td text-right font-mono">{r.actualHours > 0 ? formatHours(r.actualHours) : <span className="text-slate-300">—</span>}</td>
                      <td className={`table-td text-right font-mono font-medium ${varianceColour(r.hoursVariance)}`}>
                        {r.actualHours > 0 ? `${r.hoursVariance >= 0 ? "+" : ""}${r.hoursVariance.toFixed(1)}h` : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="table-td text-right font-mono">{r.capacityHours > 0 ? formatHours(r.capacityHours) : "—"}</td>
                      <td className={`table-td text-right font-semibold ${utilizationColour(r.utilizationPct)}`}>
                        {r.utilizationPct > 0 ? formatPct(r.utilizationPct) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="table-td text-right font-mono">{formatCurrency(r.plannedRevenue, 0)}</td>
                      <td className="table-td text-right font-mono">{r.actualRevenue > 0 ? formatCurrency(r.actualRevenue, 0) : <span className="text-slate-300">—</span>}</td>
                      <td className={`table-td text-right font-mono font-medium ${varianceColour(r.revenueVariance)}`}>
                        {r.actualRevenue > 0 ? formatCurrency(r.revenueVariance, 0) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="table-td text-right font-mono">{r.actualBillings > 0 ? formatCurrency(r.actualBillings, 0) : <span className="text-slate-300">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                  <tr>
                    <td className="px-4 py-2 text-xs font-semibold text-slate-600">TOTALS</td>
                    <td className="px-4 py-2 text-right font-semibold text-sm font-mono">{formatHours(rows.reduce((s, r) => s + r.plannedHours, 0))}</td>
                    <td className="px-4 py-2 text-right font-semibold text-sm font-mono">{formatHours(rows.reduce((s, r) => s + r.actualHours, 0))}</td>
                    <td className={`px-4 py-2 text-right font-semibold text-sm font-mono ${varianceColour(rows.reduce((s, r) => s + r.hoursVariance, 0))}`}>
                      {(() => { const v = rows.reduce((s, r) => s + r.hoursVariance, 0); return `${v >= 0 ? "+" : ""}${v.toFixed(1)}h`; })()}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-sm font-mono">{formatHours(rows.reduce((s, r) => s + r.capacityHours, 0))}</td>
                    <td className="px-4 py-2 text-right font-semibold text-sm">—</td>
                    <td className="px-4 py-2 text-right font-semibold text-sm font-mono">{formatCurrency(rows.reduce((s, r) => s + r.plannedRevenue, 0), 0)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-sm font-mono">{formatCurrency(rows.reduce((s, r) => s + r.actualRevenue, 0), 0)}</td>
                    <td className={`px-4 py-2 text-right font-semibold text-sm font-mono ${varianceColour(rows.reduce((s, r) => s + r.revenueVariance, 0))}`}>
                      {formatCurrency(rows.reduce((s, r) => s + r.revenueVariance, 0), 0)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-sm font-mono">{formatCurrency(rows.reduce((s, r) => s + r.actualBillings, 0), 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        {!loading && !loaded && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Select a date range and click <strong>Run Report</strong>.</p>
          </div>
        )}
      </main>
    </div>
  );
}
