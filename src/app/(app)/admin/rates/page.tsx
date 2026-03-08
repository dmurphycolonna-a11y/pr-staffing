"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";

interface Rate {
  id: string; hourlyRate: number; effectiveFrom: string; effectiveTo?: string | null;
  client: { id: string; name: string };
  jobTitle: { id: string; name: string; level: number };
}
interface Client { id: string; name: string; code: string }
interface JobTitle { id: string; name: string; level: number }

export default function AdminRatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ clientId: "", jobTitleId: "", hourlyRate: "", effectiveFrom: "2025-01-01", effectiveTo: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/job-titles").then((r) => r.json()),
    ]).then(([c, jt]) => { setClients(c); setJobTitles(jt); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selectedClientId) { setRates([]); return; }
    fetch(`/api/rates?clientId=${selectedClientId}`).then((r) => r.json()).then(setRates);
  }, [selectedClientId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const res = await fetch("/api/rates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, clientId: selectedClientId || form.clientId }) });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); setSaving(false); return; }
    const newRate = await res.json();
    setRates((prev) => [...prev, newRate]);
    setShowModal(false); setSaving(false);
  }

  async function saveInlineRate(id: string) {
    const newRate = parseFloat(editRate[id]);
    if (isNaN(newRate)) return;
    await fetch(`/api/rates/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hourlyRate: newRate }) });
    setRates((prev) => prev.map((r) => r.id === id ? { ...r, hourlyRate: newRate } : r));
    setEditingId(null);
  }

  async function deleteRate(id: string) {
    if (!confirm("Delete this rate?")) return;
    await fetch(`/api/rates/${id}`, { method: "DELETE" });
    setRates((prev) => prev.filter((r) => r.id !== id));
  }

  const grouped = jobTitles.map((jt) => ({
    jobTitle: jt,
    rate: rates.find((r) => r.jobTitle.id === jt.id),
  })).filter((g) => selectedClientId ? true : g.rate);

  if (loading) return <div className="flex flex-col flex-1"><Header title="Billing Rates" /><PageLoader /></div>;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Billing Rates"
        subtitle="Hourly rates by client and job title"
        actions={
          <button className="btn-primary" onClick={() => { setForm((f) => ({ ...f, clientId: selectedClientId })); setError(""); setShowModal(true); }}>
            + Add Rate
          </button>
        }
      />

      <main className="flex-1 p-6 space-y-5">
        {/* Client selector */}
        <div className="card p-4 flex items-end gap-4">
          <div className="w-72">
            <label className="block text-xs font-medium text-slate-500 mb-1">Select Client</label>
            <select className="input-base" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
              <option value="">— All clients —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {selectedClientId && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-sm text-slate-500">
                Click a rate to edit inline. Effective date: {new Date("2025-01-01").toLocaleDateString()}.
              </p>
            </div>
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-th">Job Title</th>
                  <th className="table-th">Level</th>
                  <th className="table-th text-right">Hourly Rate</th>
                  <th className="table-th">Effective From</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(({ jobTitle, rate }) => (
                  <tr key={jobTitle.id} className="table-tr">
                    <td className="table-td font-medium">{jobTitle.name}</td>
                    <td className="table-td text-slate-500 text-xs">Level {jobTitle.level}</td>
                    <td className="table-td text-right">
                      {rate ? (
                        editingId === rate.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-slate-500">$</span>
                            <input
                              type="number"
                              className="w-24 text-right border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                              value={editRate[rate.id] ?? ""}
                              onChange={(e) => setEditRate((prev) => ({ ...prev, [rate.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") saveInlineRate(rate.id); if (e.key === "Escape") setEditingId(null); }}
                              autoFocus
                            />
                            <button className="text-xs text-blue-600" onClick={() => saveInlineRate(rate.id)}>Save</button>
                            <button className="text-xs text-slate-400" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <button
                            className="font-mono font-semibold text-slate-700 hover:text-blue-600 hover:underline"
                            onClick={() => { setEditingId(rate.id); setEditRate((prev) => ({ ...prev, [rate.id]: String(rate.hourlyRate) })); }}
                          >
                            {formatCurrency(rate.hourlyRate)}/hr
                          </button>
                        )
                      ) : (
                        <span className="text-slate-300 text-sm">No rate set</span>
                      )}
                    </td>
                    <td className="table-td text-xs text-slate-500">
                      {rate ? new Date(rate.effectiveFrom).toLocaleDateString() : "—"}
                    </td>
                    <td className="table-td">
                      {rate && (
                        <button className="text-xs text-red-500 hover:text-red-700" onClick={() => deleteRate(rate.id)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {rates.length === 0 && (
                  <tr>
                    <td colSpan={5} className="table-td text-center text-slate-400 py-6">
                      No rates configured for this client. Click &ldquo;Add Rate&rdquo; to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!selectedClientId && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">Select a client to view and edit billing rates.</p>
          </div>
        )}
      </main>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Billing Rate">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
            <select required className="input-base" value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}>
              <option value="">Select…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
            <select required className="input-base" value={form.jobTitleId} onChange={(e) => setForm((f) => ({ ...f, jobTitleId: e.target.value }))}>
              <option value="">Select…</option>
              {jobTitles.map((jt) => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hourly Rate (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400">$</span>
              <input required type="number" min={0} step={1} className="input-base pl-7" value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))} placeholder="260" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Effective From</label>
              <input required type="date" className="input-base" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Effective To (optional)</label>
              <input type="date" className="input-base" value={form.effectiveTo} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Add Rate"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
