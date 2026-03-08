"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/LoadingSpinner";

interface Client { id: string; name: string; code: string; industry?: string | null; contactName?: string | null; isActive: boolean }
const EMPTY = { name: "", code: "", industry: "", contactName: "" };

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetch("/api/clients?active=false").then((r) => r.json()).then((d) => { setClients(d); setLoading(false); });
  }, []);

  function openAdd() { setEditing(null); setForm(EMPTY); setError(""); setShowModal(true); }
  function openEdit(c: Client) { setEditing(c); setForm({ name: c.name, code: c.code, industry: c.industry ?? "", contactName: c.contactName ?? "" }); setError(""); setShowModal(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const url = editing ? `/api/clients/${editing.id}` : "/api/clients";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
      const updated = await res.json();
      if (editing) setClients((prev) => prev.map((c) => c.id === editing.id ? updated : c));
      else setClients((prev) => [...prev, updated]);
      setShowModal(false);
    } finally { setSaving(false); }
  }

  async function toggleActive(c: Client) {
    const res = await fetch(`/api/clients/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !c.isActive }) });
    if (res.ok) { const updated = await res.json(); setClients((prev) => prev.map((cl) => cl.id === c.id ? updated : cl)); }
  }

  const filtered = clients.filter((c) => showInactive || c.isActive);

  if (loading) return <div className="flex flex-col flex-1"><Header title="Clients" /><PageLoader /></div>;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Manage Clients"
        subtitle={`${clients.filter((c) => c.isActive).length} active clients`}
        actions={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Show inactive
            </label>
            <button className="btn-primary" onClick={openAdd}>+ Add Client</button>
          </div>
        }
      />

      <main className="flex-1 p-6">
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-th">Client Name</th>
                <th className="table-th">Code</th>
                <th className="table-th">Industry</th>
                <th className="table-th">Contact</th>
                <th className="table-th">Status</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className={`table-tr ${!c.isActive ? "opacity-50" : ""}`}>
                  <td className="table-td font-medium">{c.name}</td>
                  <td className="table-td font-mono text-xs text-slate-500">{c.code}</td>
                  <td className="table-td text-xs text-slate-600">{c.industry ?? "—"}</td>
                  <td className="table-td text-xs text-slate-600">{c.contactName ?? "—"}</td>
                  <td className="table-td"><Badge variant={c.isActive ? "green" : "slate"}>{c.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      <button className="text-sm text-blue-600 hover:text-blue-800" onClick={() => openEdit(c)}>Edit</button>
                      <button className="text-sm text-slate-500 hover:text-slate-700" onClick={() => toggleActive(c)}>
                        {c.isActive ? "Archive" : "Restore"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Client" : "Add Client"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client Name</label>
            <input required className="input-base" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client Code (short unique ID)</label>
            <input required maxLength={8} className="input-base font-mono uppercase" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="LUXB" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
            <input className="input-base" value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} placeholder="e.g. Technology" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Primary Contact</label>
            <input className="input-base" value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
