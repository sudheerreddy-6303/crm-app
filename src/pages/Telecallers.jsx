import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, getUser } from "../api.js";

export default function Telecallers() {
  const me = getUser();
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null); // null | {} new | {..} edit
  const [msg, setMsg] = useState({ type: "", text: "" });

  const load = useCallback(() => {
    api("/users").then(setUsers).catch((e) => setMsg({ type: "error", text: e.message }));
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3500);
  };

  const removeUser = async (u) => {
    if (!window.confirm(`Delete ${u.name}? Their leads will become unassigned.`)) return;
    try {
      const data = await api(`/users/${u.id}`, { method: "DELETE" });
      flash("success", data.message);
      load();
    } catch (e) {
      flash("error", e.message);
    }
  };

  const toggleStatus = async (u) => {
    try {
      await api(`/users/${u.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: u.status === "active" ? "inactive" : "active", phone: u.phone }),
      });
      load();
    } catch (e) {
      flash("error", e.message);
    }
  };

  return (
    <div>
      <h1 className="page-title">Telecallers</h1>
      <p className="page-sub">Create accounts for your team. Telecallers only see leads assigned to them.</p>

      {msg.text && <div className={msg.type === "error" ? "error-msg" : "success-msg"}>{msg.text}</div>}

      <div className="filters">
        <button className="btn" onClick={() => setModal({})}>+ Add telecaller</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Leads</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  {/* ORIGINAL: <td><strong>{u.name}</strong>{u.id === me.id && " (you)"}</td> */}
                  {/* Telecaller names now link to their daily-calls detail page */}
                  <td>
                    {u.role === "telecaller"
                      ? <Link to={`/telecallers/${u.id}`} style={{ color: "var(--brand)", fontWeight: 700 }}>{u.name}</Link>
                      : <strong>{u.name}</strong>}
                    {u.id === me.id && " (you)"}
                  </td>
                  <td>{u.email}</td>
                  <td>{u.phone || "-"}</td>
                  <td style={{ textTransform: "capitalize" }}>{u.role}</td>
                  <td><span className={`chip ${u.status === "active" ? "yes" : "no"}`}>{u.status}</span></td>
                  <td>{u.lead_count}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn small secondary" onClick={() => setModal(u)}>Edit</button>
                      {/* ORIGINAL: {u.id !== me.id && ( ... )}
                          ADDED: an admin always gets Activate/Deactivate and Del on
                          telecaller rows, even if a stale saved session makes a
                          telecaller row look like "(you)". The self-protection now
                          only applies to the admin's own admin row. */}
                      {(u.id !== me.id || (me?.role === "admin" && u.role === "telecaller")) && (
                        <>
                          <button className="btn small secondary" onClick={() => toggleStatus(u)}>
                            {u.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                          <button className="btn small danger" onClick={() => removeUser(u)}>Del</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && (
        <UserModal
          user={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); flash("success", "Saved"); }}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSaved }) {
  const isNew = !user.id;
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    role: user.role || "telecaller",
    password: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError("");
    if (!form.name || !form.email) return setError("Name and email are required");
    if (isNew && !form.password) return setError("Password is required for a new account");
    setSaving(true);
    try {
      const body = { ...form };
      if (!body.password) delete body.password;
      if (isNew) await api("/users", { method: "POST", body: JSON.stringify(body) });
      else await api(`/users/${user.id}`, { method: "PUT", body: JSON.stringify(body) });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? "Add telecaller" : `Edit — ${user.name}`}</h3>
        {error && <div className="error-msg">{error}</div>}
        <div className="form-col">
          <div>
            <label>Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label>Email (used for login)</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label>Role</label>
            <select value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="telecaller">Telecaller</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label>{isNew ? "Password" : "New password (leave blank to keep current)"}</label>
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
          </div>
        </div>
        <div className="actions">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
