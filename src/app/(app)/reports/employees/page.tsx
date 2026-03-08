"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { formatCurrency, formatHours, formatPct, utilizationColour, varianceColour, buildCsv } from "@/lib/utils";
import type { EmployeeReportRow } from "@/types";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function monthName(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "long" });
}

export default function EmployeesReportPage() {
  const [year, setYear] = useState(2025);
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(6);
  const [rows, setRows] = useState<EmployeeReportRow[]>([]);
  const [period, setPeriod] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sortKey, setSortKey] = useState<keyof EmployeeReportRow>("plannedRevenue");
  const [sortAsc, setSortAsc] = useState(false);

  async function loadReport() {
    setLoading(true);
    const params = new URLSearchParams({ year: String(year), startMonth: String(startMonth), endMonth: String(endMonth) });
    const data = await fetch(`/api/reports/employees?${params}`).then((r) => r.json());
    setRows(data.rows ?? []);
    setPeriod(data.period?.label ?? "");
    setLoading(false);
    setLoaded(true);
  }

  function handleSort(key: keyof EmployeeReportRow) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] as number | string;
    const bv = b[sortKey] as number | string;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortAsc ? cmp : -cmp;
  });

  function exportCsv() {
    const headers = ["Employee", "Title", "Office", "Department", "Planned Hours", "Planned Revenue", "Actual Hours", "Actual Revenue", "Actual Billings", "Hours Variance", "Revenue Variance", "Capacity Hours", "Utilization %", "Avg Realized Rate"];
    const csvRows = sorted.map((r) => [r.employeeName, r.jobTitle, r.office, r.department, r.plannedHours, r.plannedRevenue, r.actualHours, r.actualRevenue, r.actualBillings, r.hoursVariance, r.revenueVariance, r.capacityHours, r.utilizationPct, r.avgRealizedRate]);
    const csv = buildCsv(headers, csvRows);
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `employee-report-${year}.csv`;
    a.click();
  }

  function SortHeader({ label, field }: { label: string; field: keyof EmployeeReportRow }) {
    return (
      <button className="flex items-center gap-1 text-left" onClick={() => handleSort(field)}>
        {label}
        {sortKey === field && <span className="text-blue-500">{sortAsc ? "↑" : "↓"}</span>}
      </button>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Employee Report"
        subtitle="Plan vs actual by staff member"
        actions={
          loaded && rows.length > 0 ? (
            <button className="btn-secondary text-sm" onClick={exportCsv}>Export CSV</button>
          ) : undefined
        }
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
                <p className="text-xs text-slate-500 uppercase tracking-wide">Employees</p>
                <p className="text-2xl font-bold mt-1">{rows.length}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Planned Hours</p>
                <p className="text-2xl font-bold mt-1">{formatHours(rows.reduce((s, r) => s + r.plannedHours, 0))}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Actual Hours</p>
                <p className="text-2xl font-bold mt-1">{formatHours(rows.reduce((s, r) => s + r.actualHours, 0))}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Utilization</p>
                <p className="text-2xl font-bold mt-1">
                  {formatPct(rows.reduce((s, r) => s + r.utilizationPct, 0) / (rows.length || 1))}
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="table-th"><SortHeader label="Employee" field="employeeName" /></th>
                    <th className="table-th">Title</th>
                    <th className="table-th">Office</th>
                    <th className="table-th text-right"><SortHeader label="Plan Hrs" field="plannedHours" /></th>
                    <th className="table-th text-right"><SortHeader label="Actual Hrs" field="actualHours" /></th>
                    <th className="table-th text-right"><SortHeader label="Hrs Δ" field="hoursVariance" /></th>
                    <th className="table-th text-right"><SortHeader label="Plan Rev" field="plannedRevenue" /></th>
                    <th className="table-th text-right"><SortHeader label="Actual Rev" field="actualRevenue" /></th>
                    <th className="table-th text-right"><SortHeader label="Rev Δ" field="revenueVariance" /></th>
                    <th className="table-th text-right"><SortHeader label="Util %" field="utilizationPct" /></th>
                    <th className="table-th text-right"><SortHeader label="Avg Rate" field="avgRealizedRate" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.employeeId} className="table-tr">
                      <td className="table-td font-medium">{r.employeeName}</td>
                      <td className="table-td text-xs text-slate-500">{r.jobTitle}</td>
                      <td className="table-td text-xs text-slate-500">{r.office}</td>
                      <td className="table-td text-right font-mono">{formatHours(r.plannedHours)}</td>
                      <td className="table-td text-right font-mono">{r.actualHours > 0 ? formatHours(r.actualHours) : <span className="text-slate-300">—</span>}</td>
                      <td className={`table-td text-right font-mono font-medium ${varianceColour(r.hoursVariance)}`}>
                        {r.actualHours > 0 ? `${r.hoursVariance >= 0 ? "+" : ""}${r.hoursVariance.toFixed(1)}h` : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="table-td text-right font-mono">{formatCurrency(r.plannedRevenue, 0)}</td>
                      <td className="table-td text-right font-mono">{r.actualRevenue > 0 ? formatCurrency(r.actualRevenue, 0) : <span className="text-slate-300">—</span>}</td>
                      <td className={`table-td text-right font-mono font-medium ${varianceColour(r.revenueVariance)}`}>
                        {r.actualRevenue > 0 ? formatCurrency(r.revenueVariance, 0) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className={`table-td text-right font-semibold ${utilizationColour(r.utilizationPct)}`}>
                        {r.actualHours > 0 ? formatPct(r.utilizationPct) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="table-td text-right font-mono text-xs">
                        {r.avgRealizedRate != null ? formatCurrency(r.avgRealizedRate, 0) + "/hr" : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-slate-600">TOTALS / AVERAGES</td>
                    <td className="px-4 py-2 text-right font-semibold text-sm font-mono">{formatHours(rows.reduce((s, r) => s + r.plannedHours, 0))}</td>
                    <td className="px-4 py-2 text-right font-semibold text-sm font-mono">{formatHours(rows.reduce((s, r) => s + r.actualHours, 0))}</td>
                    <td className={`px-4 py-2 text-right font-semibold text-sm font-mono ${varianceColour(rows.reduce((s, r) => s + r.hoursVariance, 0))}`}>
                      {(() => { const v = rows.reduce((s, r) => s + r.hoursVariance, 0); return `${v >= 0 ? "+" : ""}${v.toFixed(1)}h`; })()}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-sm font-mono">{formatCurrency(rows.reduce((s, r) => s + r.plannedRevenue, 0), 0)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-sm font-mono">{formatCurrency(rows.reduce((s, r) => s + r.actualRevenue, 0), 0)}</td>
                    <td className={`px-4 py-2 text-right font-semibold text-sm font-mono ${varianceColour(rows.reduce((s, r) => s + r.revenueVariance, 0))}`}>
                      {formatCurrency(rows.reduce((s, r) => s + r.revenueVariance, 0), 0)}
                    </td>
                    <td className={`px-4 py-2 text-right font-semibold text-sm ${utilizationColour(rows.reduce((s, r) => s + r.utilizationPct, 0) / (rows.length || 1))}`}>
                      {formatPct(rows.reduce((s, r) => s + r.utilizationPct, 0) / (rows.length || 1))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        {!loading && !loaded && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">Select a date range and click <strong>Run Report</strong>.</p>
          </div>
        )}
      </main>
    </div>
  );
}
