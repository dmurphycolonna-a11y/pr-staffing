"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { formatCurrency, formatHours, formatPct, generateMonths, monthKey, utilizationBgColour, clsx } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import type { EmployeeSummary, ClientSummary, GridRow, AllocationCell } from "@/types";

interface Props {
  clients: ClientSummary[];
  allEmployees: EmployeeSummary[];
}

type InputMode = "hours" | "percent";

// Simple debounce helper — avoids adding lodash for one function
function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function StaffingGrid({ clients, allEmployees }: Props) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(6);
  const [inputMode, setInputMode] = useState<InputMode>("hours");
  const [rows, setRows] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [addEmployeeSearch, setAddEmployeeSearch] = useState("");
  const [saveError, setSaveError] = useState("");

  const months = generateMonths(year, startMonth, year, endMonth);

  // ── Load allocations when filters change ─────────────────────────────────
  useEffect(() => {
    if (!selectedClientId) { setRows([]); return; }
    setLoading(true);
    fetch(
      `/api/allocations?clientId=${selectedClientId}&year=${year}&startMonth=${startMonth}&endMonth=${endMonth}`
    )
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedClientId, year, startMonth, endMonth]);

  // ── Save a single cell ────────────────────────────────────────────────────
  const saveCell = useCallback(
    async (
      employeeId: string,
      clientId: string,
      y: number,
      m: number,
      hours: number | null,
      pct: number | null,
    ) => {
      setSaving(true);
      setSaveError("");
      try {
        await fetch("/api/allocations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId,
            clientId,
            year: y,
            month: m,
            plannedHours: hours,
            plannedPct: pct,
          }),
        });
      } catch {
        setSaveError("Failed to save — please try again.");
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(debounce(saveCell, 700), [saveCell]);

  // ── Handle cell value change ──────────────────────────────────────────────
  function handleCellChange(
    empId: string,
    mk: string,
    rawValue: string,
    field: "hours" | "pct",
    monthDef: { year: number; month: number }
  ) {
    const numValue = rawValue === "" ? null : parseFloat(rawValue);

    setRows((prev) =>
      prev.map((row) => {
        if (row.employee.id !== empId) return row;

        const capacity = row.capacities[mk] ?? 160;
        const existing: AllocationCell = row.cells[mk] ?? {
          allocationId: null,
          plannedHours: null,
          plannedPct: null,
          plannedRevenue: null,
        };

        let hours: number | null;
        let pct: number | null;
        let revenue: number | null = null;

        if (field === "hours") {
          hours = numValue;
          pct = numValue != null ? Math.round((numValue / capacity) * 1000) / 10 : null;
        } else {
          pct = numValue;
          hours = numValue != null ? Math.round((numValue / 100) * capacity * 10) / 10 : null;
        }

        if (hours != null && row.rate != null) {
          revenue = Math.round(hours * row.rate * 100) / 100;
        }

        const newCell: AllocationCell = {
          ...existing,
          plannedHours: hours,
          plannedPct: pct,
          plannedRevenue: revenue,
        };

        return { ...row, cells: { ...row.cells, [mk]: newCell } };
      })
    );

    // Debounced persist
    const row = rows.find((r) => r.employee.id === empId);
    if (!row) return;
    const capacity = row.capacities[mk] ?? 160;

    let hours: number | null;
    let pct: number | null;

    if (field === "hours") {
      hours = numValue;
      pct = numValue != null ? (numValue / capacity) * 100 : null;
    } else {
      pct = numValue;
      hours = numValue != null ? (numValue / 100) * capacity : null;
    }

    debouncedSave(empId, selectedClientId, monthDef.year, monthDef.month, hours, pct);
  }

  // ── Add employee row ──────────────────────────────────────────────────────
  function addEmployee(emp: EmployeeSummary) {
    if (rows.some((r) => r.employee.id === emp.id)) return; // already in grid

    // Look up rate from the server (we don't have it yet — fetch after add)
    setRows((prev) => [
      ...prev,
      {
        employee: emp,
        rate: null,
        cells: {},
        capacities: {},
        totalAllocatedHours: {},
      },
    ]);
    setShowAddEmployee(false);
    setAddEmployeeSearch("");

    // Fetch the rate for this employee's job title + client
    fetch(
      `/api/rates?clientId=${selectedClientId}`
    )
      .then((r) => r.json())
      .then((rates: Array<{ jobTitleId: string; hourlyRate: number }>) => {
        const match = rates.find((rt) => rt.jobTitleId === emp.jobTitle.id);
        if (match) {
          setRows((prev) =>
            prev.map((row) =>
              row.employee.id === emp.id ? { ...row, rate: match.hourlyRate } : row
            )
          );
        }
      });
  }

  // ── Remove employee row ───────────────────────────────────────────────────
  async function removeEmployee(empId: string) {
    const row = rows.find((r) => r.employee.id === empId);
    if (!row) return;

    // Delete all allocations for this employee on this client in period
    const deletePromises = months
      .map((m) => row.cells[m.key])
      .filter((cell) => cell?.allocationId)
      .map((cell) => fetch(`/api/allocations/${cell!.allocationId}`, { method: "DELETE" }));

    await Promise.all(deletePromises);
    setRows((prev) => prev.filter((r) => r.employee.id !== empId));
  }

  // ── Derived totals ────────────────────────────────────────────────────────
  function rowTotals(row: GridRow) {
    let totalHours = 0;
    let totalRevenue = 0;
    for (const m of months) {
      totalHours += row.cells[m.key]?.plannedHours ?? 0;
      totalRevenue += row.cells[m.key]?.plannedRevenue ?? 0;
    }
    return { totalHours, totalRevenue };
  }

  function colTotals(mk: string) {
    return {
      hours: rows.reduce((s, r) => s + (r.cells[mk]?.plannedHours ?? 0), 0),
      revenue: rows.reduce((s, r) => s + (r.cells[mk]?.plannedRevenue ?? 0), 0),
    };
  }

  function totalAllocationForEmployee(row: GridRow, mk: string): number {
    return row.totalAllocatedHours[mk] ?? 0;
  }

  const employeesNotInGrid = allEmployees.filter(
    (e) => e.isActive && !rows.some((r) => r.employee.id === e.id)
  );

  const filteredAddList = employeesNotInGrid.filter((e) =>
    addEmployeeSearch === "" ||
    e.name.toLowerCase().includes(addEmployeeSearch.toLowerCase()) ||
    e.jobTitle.name.toLowerCase().includes(addEmployeeSearch.toLowerCase())
  );

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="flex-1 flex flex-col">
      {/* Controls bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-end gap-4">
        {/* Client selector */}
        <div className="min-w-[220px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Client</label>
          <select
            className="input-base"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            <option value="">— Select a client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className="w-24">
          <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
          <select className="input-base" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Start month */}
        <div className="w-32">
          <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
          <select className="input-base" value={startMonth} onChange={(e) => setStartMonth(parseInt(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(year, m - 1, 1).toLocaleString("en-US", { month: "long" })}
              </option>
            ))}
          </select>
        </div>

        {/* End month */}
        <div className="w-32">
          <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
          <select
            className="input-base"
            value={endMonth}
            onChange={(e) => setEndMonth(parseInt(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1)
              .filter((m) => m >= startMonth)
              .map((m) => (
                <option key={m} value={m}>
                  {new Date(year, m - 1, 1).toLocaleString("en-US", { month: "long" })}
                </option>
              ))}
          </select>
        </div>

        {/* Input mode toggle */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Input mode</label>
          <div className="flex rounded-md border border-slate-300 overflow-hidden text-sm">
            <button
              className={clsx("px-3 py-1.5 font-medium transition-colors", inputMode === "hours" ? "bg-blue-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}
              onClick={() => setInputMode("hours")}
            >
              Hours
            </button>
            <button
              className={clsx("px-3 py-1.5 font-medium transition-colors border-l border-slate-300", inputMode === "percent" ? "bg-blue-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}
              onClick={() => setInputMode("percent")}
            >
              %
            </button>
          </div>
        </div>

        <div className="ml-auto flex items-end gap-3">
          {saving && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <LoadingSpinner size="sm" /> Saving…
            </div>
          )}
          {saveError && <p className="text-xs text-red-600">{saveError}</p>}

          {selectedClientId && (
            <button
              className="btn-primary"
              onClick={() => setShowAddEmployee(true)}
            >
              + Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Grid area */}
      {!selectedClientId ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Select a client to view or edit the staffing plan.
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto grid-scroll p-6">
          <div className="min-w-max">
            {/* Grid table */}
            <table className="border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="table-th text-left w-48 sticky left-0 bg-slate-50 z-10">Employee</th>
                  <th className="table-th text-left w-32">Title</th>
                  <th className="table-th text-right w-20">Rate/hr</th>
                  {months.map((m) => (
                    <th key={m.key} className="table-th text-right w-28">{m.label}</th>
                  ))}
                  <th className="table-th text-right w-24">Total Hrs</th>
                  <th className="table-th text-right w-28">Total Rev</th>
                  <th className="table-th w-10"></th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4 + months.length + 2} className="px-4 py-8 text-center text-slate-400">
                      No employees added. Click &ldquo;Add Employee&rdquo; to begin.
                    </td>
                  </tr>
                )}

                {rows.map((row) => {
                  const { totalHours, totalRevenue } = rowTotals(row);
                  return (
                    <tr key={row.employee.id} className="table-tr group">
                      {/* Employee name — sticky */}
                      <td className="table-td font-medium sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100">
                        <div className="flex flex-col">
                          <span>{row.employee.name}</span>
                          {row.employee.office && (
                            <span className="text-xs text-slate-400">{row.employee.office.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="table-td text-slate-500 text-xs">{row.employee.jobTitle.name}</td>
                      <td className="table-td text-right font-mono">
                        {row.rate != null ? `$${row.rate}` : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Monthly cells */}
                      {months.map((m) => {
                        const cell = row.cells[m.key];
                        const capacity = row.capacities[m.key] ?? 160;
                        const allClientTotal = totalAllocationForEmployee(row, m.key);
                        const isOver = allClientTotal > capacity;
                        const displayValue = inputMode === "hours"
                          ? (cell?.plannedHours != null ? String(cell.plannedHours) : "")
                          : (cell?.plannedPct != null ? String(cell.plannedPct) : "");

                        return (
                          <td key={m.key} className="px-1 py-1.5">
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="relative">
                                <input
                                  type="number"
                                  min={0}
                                  max={inputMode === "hours" ? 400 : 100}
                                  step={inputMode === "hours" ? 1 : 5}
                                  value={displayValue}
                                  onChange={(e) =>
                                    handleCellChange(
                                      row.employee.id,
                                      m.key,
                                      e.target.value,
                                      inputMode === "hours" ? "hours" : "pct",
                                      m
                                    )
                                  }
                                  className={clsx(
                                    "w-24 text-right rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1",
                                    isOver
                                      ? "border-red-400 bg-red-50 focus:ring-red-400"
                                      : "border-slate-200 focus:ring-blue-400 focus:border-blue-400 hover:border-slate-300"
                                  )}
                                  placeholder={inputMode === "hours" ? "0h" : "0%"}
                                />
                                {isOver && (
                                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" title={`Over-allocated: ${allClientTotal}h vs ${capacity}h capacity`} />
                                )}
                              </div>
                              {cell?.plannedRevenue != null && cell.plannedRevenue > 0 && (
                                <span className="text-xs text-slate-400 font-mono pr-1">
                                  {formatCurrency(cell.plannedRevenue, 0)}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Row totals */}
                      <td className="table-td text-right font-semibold text-slate-700">
                        {totalHours > 0 ? `${totalHours.toFixed(0)}h` : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="table-td text-right font-semibold text-slate-700">
                        {totalRevenue > 0 ? formatCurrency(totalRevenue, 0) : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Remove button */}
                      <td className="table-td px-2">
                        <button
                          onClick={() => removeEmployee(row.employee.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove from plan"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Column totals footer */}
              {rows.length > 0 && (
                <tfoot className="border-t-2 border-slate-300 bg-slate-50">
                  <tr>
                    <td className="px-4 py-2 font-semibold text-xs text-slate-600 sticky left-0 bg-slate-50" colSpan={3}>
                      TOTALS
                    </td>
                    {months.map((m) => {
                      const { hours, revenue } = colTotals(m.key);
                      return (
                        <td key={m.key} className="px-1 py-2 text-right">
                          <div className="font-semibold text-slate-700 text-sm">{hours > 0 ? `${hours.toFixed(0)}h` : "—"}</div>
                          {revenue > 0 && (
                            <div className="text-xs text-slate-400 font-mono">{formatCurrency(revenue, 0)}</div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-right font-bold text-slate-800">
                      {formatHours(rows.reduce((s, r) => s + rowTotals(r).totalHours, 0))}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-slate-800">
                      {formatCurrency(rows.reduce((s, r) => s + rowTotals(r).totalRevenue, 0), 0)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>

            {/* Utilization summary below grid */}
            {rows.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Utilization vs Capacity — All Clients
                </h3>
                <div className="space-y-2">
                  {rows.map((row) => {
                    const avgAlloc = months.reduce((s, m) => s + (row.totalAllocatedHours[m.key] ?? 0), 0);
                    const avgCap = months.reduce((s, m) => s + (row.capacities[m.key] ?? 160), 0);
                    const pct = avgCap > 0 ? Math.min((avgAlloc / avgCap) * 100, 120) : 0;
                    return (
                      <div key={row.employee.id} className="flex items-center gap-3 text-sm">
                        <div className="w-40 truncate text-slate-600">{row.employee.name}</div>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full">
                          <div
                            className={`h-2 rounded-full transition-all ${utilizationBgColour(pct)}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <div className={`w-12 text-right text-xs font-medium ${utilizationBgColour(pct).replace("bg-", "text-")}`}>
                          {formatPct(pct)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Employee Modal (inline dropdown) */}
      {showAddEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddEmployee(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-96 max-h-[70vh] flex flex-col z-10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">Add Employee to Plan</h2>
              <button
                onClick={() => setShowAddEmployee(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <input
                type="text"
                placeholder="Search by name or title…"
                className="input-base"
                value={addEmployeeSearch}
                onChange={(e) => setAddEmployeeSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredAddList.length === 0 && (
                <p className="px-5 py-4 text-sm text-slate-400">No employees to add.</p>
              )}
              {filteredAddList.map((emp) => (
                <button
                  key={emp.id}
                  className="flex items-center gap-3 w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50"
                  onClick={() => addEmployee(emp)}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold shrink-0">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{emp.name}</div>
                    <div className="text-xs text-slate-500">
                      {emp.jobTitle.name}
                      {emp.office ? ` · ${emp.office.name}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
