"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import type { UserRole } from "@/types";

interface AppUser { id: string; name: string; email: string; role: UserRole; isActive: boolean }

const ROLES: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "STAFFING_MANAGER", label: "Staffing Manager" },
  { value: "FINANCE", label: "Finance" },
  { value: "DEPARTMENT_LEADER", label: "Department Leader" },
  { value: "EMPLOYEE_MANAGER", label: "Employee Manager" },
];

const ROLE_BADGE: Record<UserRole, "blue" | "red" | "green" | "amber" | "purple"> = {
  ADMIN: "red",
  STAFFING_MANAGER: "blue",
  FINANCE: "green",
  DEPARTMENT_LEADER: "amber",
  EMPLOYEE_MANAGER: "purple",
};

const EMPTY = { name: "", email: "", role: "STAFFING_MANAGER" as UserRole, password: "" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => { setUsers(d); setLoading(false); });
  }, []);

  function openAdd() { setEditing(null); setForm(EMPTY); setError(""); setShowModal(true); }
  function openEdit(u: AppUser) { setEditing(u); setForm({ name: u.name, email: u.email, role: u.role, password: "" }); setError(""); setShowModal(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const payload: Record<string, string> = { name: form.name, email: form.email, role: form.role };
    if (form.password) payload.password = form.password;
    try {
      const url = editing ? `/api/users/${editing.id}` : "/api/users";
      const method = editing ? "PATCH" : "POST";
      if (!editing) payload.password = form.password; // required for new users
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
      const updated = await res.json();
      if (editing) setUsers((prev) => prev.map((u) => u.id === editing.id ? updated : u));
      else setUsers((prev) => [...prev, updated]);
      setShowModal(false);
    } finally { setSaving(false); }
  }

  async function toggleActive(u: AppUser) {
    const res = await fetch(`/api/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !u.isActive }) });
    if (res.ok) { const updated = await res.json(); setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, ...updated } : x)); }
  }

  if (loading) return <div className="flex flex-col flex-1"><Header title="Users" /><PageLoader /></div>;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Manage Users"
        subtitle={`${users.filter((u) => u.isActive).length} active users`}
        actions={<button className="btn-primary" onClick={openAdd}>+ Add User</button>}
      />

      <main className="flex-1 p-6">
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th">Status</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={`table-tr ${!u.isActive ? "opacity-50" : ""}`}>
                  <td className="table-td font-medium">{u.name}</td>
                  <td className="table-td text-slate-500 text-sm">{u.email}</td>
                  <td className="table-td">
                    <Badge variant={ROLE_BADGE[u.role]}>
                      {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                    </Badge>
                  </td>
                  <td className="table-td"><Badge variant={u.isActive ? "green" : "slate"}>{u.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      <button className="text-sm text-blue-600 hover:text-blue-800" onClick={() => openEdit(u)}>Edit</button>
                      <button className="text-sm text-slate-500 hover:text-slate-700" onClick={() => toggleActive(u)}>
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit User" : "Add User"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input required className="input-base" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input required type="email" className="input-base" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select className="input-base" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {editing ? "New Password (leave blank to keep)" : "Password"}
            </label>
            <input
              type="password"
              className="input-base"
              required={!editing}
              minLength={6}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={editing ? "Leave blank to keep current" : "Min 6 characters"}
            />
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
