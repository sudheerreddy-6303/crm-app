import React, { useState } from "react";
import { api } from "../api.js";

// ADDED: Call history with admin replies. Used by the lead form (Follow up /
// Edit) and the admin "View" pop-up. Shows every call remark with its date,
// telecaller and category; under each remark the admin's replies are shown.
// - Admin: "Reply" button on each remark (and can delete their replies).
// - Telecaller: sees the admin's replies under their remarks (read-only).
// Layout: columns on computers, stacked on phones (see .ch-* in styles.css).
const fmtDate = (d) => (d ? String(d).slice(0, 10) : "-");
const fmtDateTime = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt) ? String(d) : dt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

export default function CallHistory({ leadId, logs, isAdmin, onChanged }) {
  const [openFor, setOpenFor] = useState(null); // log id whose reply box is open
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const openReply = (id) => { setOpenFor(id); setText(""); setError(""); };

  const send = async (logId) => {
    const reply = text.trim();
    if (!reply) { setError("Type a reply first"); return; }
    setSending(true); setError("");
    try {
      await api(`/leads/${leadId}/logs/${logId}/replies`, { method: "POST", body: JSON.stringify({ reply }) });
      setOpenFor(null); setText("");
      onChanged && onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const remove = async (logId, replyId) => {
    if (!window.confirm("Delete this reply?")) return;
    try {
      await api(`/leads/${leadId}/logs/${logId}/replies/${replyId}`, { method: "DELETE" });
      onChanged && onChanged();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!logs || logs.length === 0) return <div className="ch-empty">No call history yet.</div>;

  return (
    <div className="ch-list">
      <div className="ch-head" aria-hidden="true">
        <span>Date</span><span>By</span><span>Category</span><span>Remark</span>
      </div>
      {logs.map((g) => (
        <div className="ch-item" key={g.id}>
          <div className="ch-row">
            <span className="ch-date">{fmtDate(g.log_date)}</span>
            <span className="ch-by">{g.user_name || "-"}</span>
            <span className="ch-cat">{g.category || "-"}</span>
            <span className="ch-remark">{g.remark || "-"}</span>
          </div>

          {(g.replies || []).map((rp) => (
            <div className="ch-reply" key={rp.id}>
              <div className="ch-reply-meta">
                <b>↳ Reply from {rp.user_name || "Admin"}</b>
                <span>{fmtDateTime(rp.created_at)}</span>
                {isAdmin && (
                  <button type="button" className="ch-link danger" onClick={() => remove(g.id, rp.id)}>Delete</button>
                )}
              </div>
              <div className="ch-reply-text">{rp.reply}</div>
            </div>
          ))}

          {isAdmin && openFor !== g.id && (
            <button type="button" className="btn small secondary ch-reply-btn" onClick={() => openReply(g.id)}>
              ↩ Reply
            </button>
          )}
          {isAdmin && openFor === g.id && (
            <div className="ch-reply-box">
              <textarea rows={2} autoFocus value={text} maxLength={2000}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={`Reply to ${g.user_name || "telecaller"}...`} />
              {error && <div className="error-msg" style={{ margin: 0 }}>{error}</div>}
              <div className="ch-reply-actions">
                <button type="button" className="btn small secondary" onClick={() => setOpenFor(null)} disabled={sending}>Cancel</button>
                <button type="button" className="btn small" onClick={() => send(g.id)} disabled={sending}>
                  {sending ? "Sending..." : "Send reply"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
