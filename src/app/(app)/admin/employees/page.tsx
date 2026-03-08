"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/LoadingSpinner";

interface Employee {
  id: string; name: string; email: string; isActive: boolean;
  jobTitle: { id: string; name: string };
  office?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
}
interface JobTitle { id: string; name: string; level: number }
interface Office { id: string; name: string }
interface Department { id: string; name: string; officeId: string }

const EMPTY_FORM = { name: "", email: "", jobTitleId: "", officeId: "", departmentId: "", startDate: "" };

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/employees?active=false").then((r) => r.json()),
      fetch("/api/job-titles").then((r) => r.json()),
      fetch("/api/offices").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ]).then(([emps, jts, offs, depts]) => {
      setEmployees(emps); setJobTitles(jts); setOffices(offs); setDepartments(depts);
      setLoading(false);
    });
  }, []);

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setError(""); setShowModal(true); }
  function openEdit(emp: Employee) {
    setEditing(emp);
    setForm({ name: emp.name, email: emp.email, jobTitleId: emp.jobTitle.id, officeId: emp.office?.id ?? "", departmentId: emp.department?.id ?? "", startDate: "" });
    setError(""); setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const url = editing ? `/api/employees/${editing.id}` : "/api/employees";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
      const updated = await res.json();
      if (editing) setEmployees((prev) => prev.map((e) => e.id === editing.id ? updated : e));
      else setEmployees((prev) => [...prev, updated]);
      setShowModal(false);
    } finally { setSaving(false); }
  }

  async function toggleActive(emp: Employee) {
    const res = await fetch(`/api/employees/${emp.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !emp.isActive }) });
    if (res.ok) { const updated = await res.json(); setEmployees((prev) => prev.map((e) => e.id === emp.id ? updated : e)); }
  }

  const filtered = employees.filter((e) => showInactive || e.isActive);
  const deptsByOffice = departments.filter((d) => !form.officeId || d.officeId === form.officeId);

  if (loading) return <div className="flex flex-col flex-1"><Header title="Employees" /><PageLoader /></div>;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Manage Employees"
        subtitle={`${employees.filter((e) => e.isActive).length} active · ${employees.filter((e) => !e.isActive).length} inactive`}
        actions={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Show inactive
            </label>
            <button className="btn-primary" onClick={openAdd}>+ Add Employee</button>
          </div>
        }
      />

      <main className="flex-1 p-6">
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Email</th>
                <th className="table-th">Title</th>
                <th className="table-th">Office</th>
                <th className="table-th">Department</th>
                <th className="table-th">Status</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id} className={`table-tr ${!emp.isActive ? "opacity-50" : ""}`}>
                  <td className="table-td font-medium">{emp.name}</td>
                  <td className="table-td text-slate-500 text-xs">{emp.email}</td>
                  <td className="table-td text-xs text-slate-600">{emp.jobTitle.name}</td>
                  <td className="table-td text-xs text-slate-600">{emp.office?.name ?? "—"}</td>
                  <td className="table-td text-xs text-slate-600">{emp.department?.name ?? "—"}</td>
                  <td className="table-td">
                    <Badge variant={emp.isActive ? "green" : "slate"}>{emp.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      <button className="text-sm text-blue-600 hover:text-blue-800" onClick={() => openEdit(emp)}>Edit</button>
                      <button className="text-sm text-slate-500 hover:text-slate-700" onClick={() => toggleActive(emp)}>
                        {emp.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Employee" : "Add Employee"} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input required className="input-base" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input required type="email" className="input-base" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
            <select required className="input-base" value={form.jobTitleId} onChange={(e) => setForm((f) => ({ ...f, jobTitleId: e.target.value }))}>
              <option value="">Select…</option>
              {jobTitles.map((jt) => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Office</label>
              <select className="input-base" value={form.officeId} onChange={(e) => setForm((f) => ({ ...f, officeId: e.target.value, departmentId: "" }))}>
                <option value="">None</option>
                {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <select className="input-base" value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
                <option value="">None</option>
                {deptsByOffice.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input type="date" className="input-base" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
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
