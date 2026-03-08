"use client";

import { useState, useRef } from "react";
import type { EmployeeSummary, ClientSummary } from "@/types";
import { formatCurrency, formatHours } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Papa from "papaparse";

interface Props {
  employees: EmployeeSummary[];
  clients: ClientSummary[];
}

interface ActualRow {
  id: string;
  year: number;
  month: number;
  employee: { id: string; name: string; email: string; jobTitle: { name: string } };
  client: { id: string; name: string; code: string };
  actualHours: number | null;
  actualRevenue: number | null;
  actualBillings: number | null;
  source: string | null;
}

interface ImportRow {
  employee_email: string;
  client_code: string;
  year: number;
  month: number;
  actual_hours?: number;
  actual_revenue?: number;
  actual_billings?: number;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i, 1).toLocaleString("en-US", { month: "long" }),
}));

export function ActualsManager({ employees, clients }: Props) {
  const [tab, setTab] = useState<"view" | "manual" | "import">("view");

  // View/filter state
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterClientId, setFilterClientId] = useState("");
  const [actuals, setActuals] = useState<ActualRow[]>([]);
  const [loadingActuals, setLoadingActuals] = useState(false);
  const [actualsLoaded, setActualsLoaded] = useState(false);

  // Manual entry state
  const [manualEmpId, setManualEmpId] = useState("");
  const [manualClientId, setManualClientId] = useState("");
  const [manualYear, setManualYear] = useState(new Date().getFullYear());
  const [manualMonth, setManualMonth] = useState(new Date().getMonth() + 1);
  const [manualHours, setManualHours] = useState("");
  const [manualRevenue, setManualRevenue] = useState("");
  const [manualBillings, setManualBillings] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualMsg, setManualMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // CSV import state
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<ImportRow[]>([]);
  const [csvError, setCsvError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  // ── Load actuals ────────────────────────────────────────────────────────
  async function loadActuals() {
    setLoadingActuals(true);
    const params = new URLSearchParams({
      year: String(filterYear),
      month: String(filterMonth),
      ...(filterClientId && { clientId: filterClientId }),
    });
    const data = await fetch(`/api/actuals?${params}`).then((r) => r.json());
    setActuals(data);
    setActualsLoaded(true);
    setLoadingActuals(false);
  }

  // ── Manual save ─────────────────────────────────────────────────────────
  async function handleManualSave(e: React.FormEvent) {
    e.preventDefault();
    if (!manualEmpId || !manualClientId) {
      setManualMsg({ type: "err", text: "Employee and client are required." });
      return;
    }
    setManualSaving(true);
    setManualMsg(null);
    try {
      await fetch("/api/actuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: manualEmpId,
          clientId: manualClientId,
          year: manualYear,
          month: manualMonth,
          actualHours: manualHours !== "" ? manualHours : null,
          actualRevenue: manualRevenue !== "" ? manualRevenue : null,
          actualBillings: manualBillings !== "" ? manualBillings : null,
        }),
      });
      setManualMsg({ type: "ok", text: "Saved successfully." });
      setManualHours("");
      setManualRevenue("");
      setManualBillings("");
    } catch {
      setManualMsg({ type: "err", text: "Failed to save. Please try again." });
    } finally {
      setManualSaving(false);
    }
  }

  // ── CSV parse ────────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError("");
    setImportResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data as Record<string, string>[];
        const parsed: ImportRow[] = rows.map((row) => ({
          employee_email: row["employee_email"] ?? row["Employee Email"] ?? "",
          client_code: row["client_code"] ?? row["Client Code"] ?? "",
          year: parseInt(row["year"] ?? row["Year"] ?? ""),
          month: parseInt(row["month"] ?? row["Month"] ?? ""),
          actual_hours: row["actual_hours"] ? parseFloat(row["actual_hours"]) : undefined,
          actual_revenue: row["actual_revenue"] ? parseFloat(row["actual_revenue"]) : undefined,
          actual_billings: row["actual_billings"] ? parseFloat(row["actual_billings"]) : undefined,
        }));
        setCsvPreview(parsed);
      },
      error: () => setCsvError("Failed to parse CSV file."),
    });
  }

  async function handleImport() {
    if (csvPreview.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await fetch("/api/actuals/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: csvPreview }),
      }).then((r) => r.json());
      setImportResult(result);
      if (result.imported > 0) setCsvPreview([]);
    } catch {
      setCsvError("Import request failed.");
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const csv = [
      "employee_email,client_code,year,month,actual_hours,actual_revenue,actual_billings",
      "sarah.chen@agency.com,LUXB,2025,4,58.5,18720,17222",
      "marcus.johnson@agency.com,GNLF,2025,4,62,16120,14830",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "actuals-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="flex gap-0">
          {(["view", "manual", "import"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {t === "view" ? "View Actuals" : t === "manual" ? "Manual Entry" : "CSV Import"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* ── VIEW TAB ─────────────────────────────────────────────────── */}
        {tab === "view" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="card p-4 flex flex-wrap gap-4 items-end">
              <div className="w-24">
                <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
                <select className="input-base" value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}>
                  {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="w-36">
                <label className="block text-xs font-medium text-slate-500 mb-1">Month</label>
                <select className="input-base" value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))}>
                  {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="w-56">
                <label className="block text-xs font-medium text-slate-500 mb-1">Client</label>
                <select className="input-base" value={filterClientId} onChange={(e) => setFilterClientId(e.target.value)}>
                  <option value="">All clients</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button className="btn-primary" onClick={loadActuals}>Load</button>
            </div>

            {/* Results */}
            {loadingActuals && <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>}

            {!loadingActuals && actualsLoaded && (
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="table-th">Employee</th>
                      <th className="table-th">Client</th>
                      <th className="table-th text-right">Actual Hours</th>
                      <th className="table-th text-right">Actual Revenue</th>
                      <th className="table-th text-right">Actual Billings</th>
                      <th className="table-th">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actuals.length === 0 && (
                      <tr>
                        <td colSpan={6} className="table-td text-center text-slate-400 py-8">
                          No actuals found for this period.
                        </td>
                      </tr>
                    )}
                    {actuals.map((row) => (
                      <tr key={row.id} className="table-tr">
                        <td className="table-td">
                          <div className="font-medium">{row.employee.name}</div>
                          <div className="text-xs text-slate-400">{row.employee.jobTitle.name}</div>
                        </td>
                        <td className="table-td text-slate-600">{row.client.name}</td>
                        <td className="table-td text-right font-mono">{formatHours(row.actualHours)}</td>
                        <td className="table-td text-right font-mono">{formatCurrency(row.actualRevenue)}</td>
                        <td className="table-td text-right font-mono">{formatCurrency(row.actualBillings)}</td>
                        <td className="table-td">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${row.source === "csv_import" ? "bg-purple-100 text-purple-700" : row.source === "seed" ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700"}`}>
                            {row.source ?? "manual"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {actuals.length > 0 && (
                    <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-slate-600">TOTALS</td>
                        <td className="px-4 py-2 text-right font-semibold text-sm">
                          {formatHours(actuals.reduce((s, a) => s + (a.actualHours ?? 0), 0))}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-sm">
                          {formatCurrency(actuals.reduce((s, a) => s + (a.actualRevenue ?? 0), 0))}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-sm">
                          {formatCurrency(actuals.reduce((s, a) => s + (a.actualBillings ?? 0), 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── MANUAL ENTRY TAB ─────────────────────────────────────────── */}
        {tab === "manual" && (
          <div className="max-w-lg">
            <div className="card p-6">
              <h2 className="text-base font-semibold text-slate-800 mb-5">Enter Actuals Manually</h2>
              <form onSubmit={handleManualSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
                  <select className="input-base" value={manualEmpId} onChange={(e) => setManualEmpId(e.target.value)} required>
                    <option value="">Select employee…</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.name} ({e.jobTitle.name})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
                  <select className="input-base" value={manualClientId} onChange={(e) => setManualClientId(e.target.value)} required>
                    <option value="">Select client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                    <select className="input-base" value={manualYear} onChange={(e) => setManualYear(parseInt(e.target.value))}>
                      {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                    <select className="input-base" value={manualMonth} onChange={(e) => setManualMonth(parseInt(e.target.value))}>
                      {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hours</label>
                    <input type="number" step="0.5" min={0} className="input-base" value={manualHours} onChange={(e) => setManualHours(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Revenue ($)</label>
                    <input type="number" step="0.01" min={0} className="input-base" value={manualRevenue} onChange={(e) => setManualRevenue(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Billings ($)</label>
                    <input type="number" step="0.01" min={0} className="input-base" value={manualBillings} onChange={(e) => setManualBillings(e.target.value)} placeholder="0" />
                  </div>
                </div>

                {manualMsg && (
                  <p className={`text-sm p-3 rounded-lg ${manualMsg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                    {manualMsg.text}
                  </p>
                )}

                <button type="submit" disabled={manualSaving} className="btn-primary w-full">
                  {manualSaving ? "Saving…" : "Save Actuals"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── CSV IMPORT TAB ────────────────────────────────────────────── */}
        {tab === "import" && (
          <div className="space-y-4 max-w-3xl">
            <div className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Import from CSV</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Upload a CSV file mapping employees to clients with actual hours and revenue.
                  </p>
                </div>
                <button className="btn-secondary text-xs" onClick={downloadTemplate}>
                  Download Template
                </button>
              </div>

              {/* Column reference */}
              <div className="bg-slate-50 rounded-lg p-3 mb-5 text-xs font-mono text-slate-600">
                employee_email, client_code, year, month, actual_hours, actual_revenue, actual_billings
              </div>

              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                className="btn-secondary"
                onClick={() => fileRef.current?.click()}
              >
                Choose CSV file
              </button>

              {csvError && <p className="mt-3 text-sm text-red-600">{csvError}</p>}
            </div>

            {/* Preview */}
            {csvPreview.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Preview — {csvPreview.length} rows
                  </h3>
                  <button
                    className="btn-primary"
                    onClick={handleImport}
                    disabled={importing}
                  >
                    {importing ? <><LoadingSpinner size="sm" /> Importing…</> : `Import ${csvPreview.length} rows`}
                  </button>
                </div>
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="table-th">Email</th>
                        <th className="table-th">Client</th>
                        <th className="table-th">Year</th>
                        <th className="table-th">Month</th>
                        <th className="table-th text-right">Hours</th>
                        <th className="table-th text-right">Revenue</th>
                        <th className="table-th text-right">Billings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} className="table-tr">
                          <td className="table-td">{row.employee_email}</td>
                          <td className="table-td">{row.client_code}</td>
                          <td className="table-td">{row.year}</td>
                          <td className="table-td">{row.month}</td>
                          <td className="table-td text-right">{row.actual_hours ?? "—"}</td>
                          <td className="table-td text-right">{row.actual_revenue ?? "—"}</td>
                          <td className="table-td text-right">{row.actual_billings ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import result */}
            {importResult && (
              <div className={`card p-5 ${importResult.skipped > 0 ? "border-amber-200" : "border-green-200"}`}>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Import Result</h3>
                <div className="flex gap-6 text-sm mb-3">
                  <span className="text-green-700 font-medium">{importResult.imported} imported</span>
                  {importResult.skipped > 0 && (
                    <span className="text-amber-700 font-medium">{importResult.skipped} skipped</span>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <ul className="text-xs text-red-600 space-y-0.5">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
