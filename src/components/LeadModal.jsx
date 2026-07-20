import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const CATEGORIES = ["NOT INTERESTED", "FOLLOW UP", "INTERESTED", "NOT ANSWERED"];
const fmt = (d) => (d ? String(d).slice(0, 10) : "");

export default function LeadModal({ lead, telecallers, isAdmin, onClose, onSaved }) {
  const isNew = !lead.id;
  const [form, setForm] = useState({
    name: lead.name || "",
    // ADDED: project name (mandatory during Excel import, editable here by admin)
    project_name: lead.project_name || "",
    primary_phone: lead.primary_phone || "",
    assigned_to: lead.assigned_to || "",
    first_calling_date: fmt(lead.first_calling_date),
    second_calling_date: fmt(lead.second_calling_date),
    call_category: lead.call_category || "",
    quote_sent: lead.quote_sent || "",
    order_booked: lead.order_booked || "",
    whatsapp_sent_date: fmt(lead.whatsapp_sent_date),
    whatsapp_category: lead.whatsapp_category || "",
    calling_remark: lead.calling_remark || "",
    next_call_date: fmt(lead.next_call_date),
    priority: lead.priority || "none",
    source: lead.source || "",
  });
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      api(`/leads/${lead.id}/logs`).then(setLogs).catch(() => {});
    }
  }, [lead.id, isNew]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError("");
    if (isNew && (!form.name || !form.primary_phone)) {
      return setError("Name and primary phone are required");
    }
    setSaving(true);
    try {
      if (isNew) {
        await api("/leads", { method: "POST", body: JSON.stringify(form) });
      } else {
        await api(`/leads/${lead.id}`, { method: "PUT", body: JSON.stringify(form) });
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? "Add lead" : `Edit lead — ${lead.name}`}</h3>
        {error && <div className="error-msg">{error}</div>}

        <div className="form-grid">
          <div>
            <label>Name {isAdmin ? "" : "(admin only)"}</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} disabled={!isAdmin} />
          </div>
          {/* ADDED: Project Name field (mandatory during Excel import) */}
          <div>
            <label>Project name {isAdmin ? "" : "(admin only)"}</label>
            <input value={form.project_name} onChange={(e) => set("project_name", e.target.value)} disabled={!isAdmin} />
          </div>
          <div>
            <label>Primary phone</label>
            <input value={form.primary_phone} onChange={(e) => set("primary_phone", e.target.value)} disabled={!isAdmin} />
          </div>
          {isAdmin && (
            <div>
              <label>Assigned telecaller</label>
              <select value={form.assigned_to || ""} onChange={(e) => set("assigned_to", e.target.value)}>
                <option value="">Unassigned</option>
                {telecallers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label>1st calling date</label>
            <input type="date" value={form.first_calling_date} onChange={(e) => set("first_calling_date", e.target.value)} />
          </div>
          <div>
            <label>2nd calling date</label>
            <input type="date" value={form.second_calling_date} onChange={(e) => set("second_calling_date", e.target.value)} />
          </div>
          <div>
            <label>Call category</label>
            <select value={form.call_category} onChange={(e) => set("call_category", e.target.value)}>
              <option value="">—</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>Quote sent</label>
            <select value={form.quote_sent} onChange={(e) => set("quote_sent", e.target.value)}>
              <option value="">—</option><option>Yes</option><option>No</option>
            </select>
          </div>
          <div>
            <label>Order booked</label>
            <select value={form.order_booked} onChange={(e) => set("order_booked", e.target.value)}>
              <option value="">—</option><option>Yes</option><option>No</option>
            </select>
          </div>
          <div>
            <label>WhatsApp message sent on</label>
            <input type="date" value={form.whatsapp_sent_date} onChange={(e) => set("whatsapp_sent_date", e.target.value)} />
          </div>
          <div>
            <label>WhatsApp category</label>
            <input value={form.whatsapp_category} onChange={(e) => set("whatsapp_category", e.target.value)} placeholder="e.g. DECOR" />
          </div>
          <div>
            <label>Next call date</label>
            <input type="date" value={form.next_call_date} onChange={(e) => set("next_call_date", e.target.value)} />
          </div>
          <div>
            <label>Priority</label>
            <select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              <option value="none">None</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>
          {isAdmin && (
            <div>
              <label>Source</label>
              <input value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="e.g. JustDial, Website" />
            </div>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>
            Calling remark
          </label>
          <textarea
            style={{ width: "100%", padding: "9px 10px", border: "1px solid var(--line)", borderRadius: 8 }}
            value={form.calling_remark}
            onChange={(e) => set("calling_remark", e.target.value)}
            placeholder="e.g. she wants designs (guntur 4bhk) (sent)"
          />
        </div>

        {!isNew && logs.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 14 }}>Call history</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>By</th><th>Category</th><th>Remark</th></tr></thead>
                <tbody>
                  {logs.map((g) => (
                    <tr key={g.id}>
                      <td>{String(g.log_date).slice(0, 10)}</td>
                      <td>{g.user_name || "-"}</td>
                      <td>{g.category || "-"}</td>
                      <td className="remark">{g.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="actions">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Create lead" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
