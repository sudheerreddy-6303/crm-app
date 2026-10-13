import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api.js";
import LeadModal from "./LeadModal.jsx";

// ADDED: Notifications bell (top-right corner, telecallers only).
// Shows admin replies to the telecaller's call remarks. The red badge is the
// number of unread replies. Clicking a notification marks it read and opens
// that lead's Follow up form, where the reply is shown in the Call history.
// Refreshes every 60 seconds, on page change and when the tab is focused.
const fmtDateTime = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt) ? String(d) : dt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ unread: 0, notifications: [] });
  const [loading, setLoading] = useState(false);
  const [lead, setLead] = useState(null); // lead opened from a notification
  const [error, setError] = useState("");
  const wrapRef = useRef(null);
  const location = useLocation();

  const load = useCallback(() => {
    api("/notifications")
      .then((d) => setData({ unread: d.unread || 0, notifications: d.notifications || [] }))
      .catch(() => {});
  }, []);

  // refresh: on page change, every 60s, and when the browser tab gets focus
  useEffect(() => { load(); }, [load, location.pathname]);
  useEffect(() => {
    const t = setInterval(load, 60000);
    window.addEventListener("focus", load);
    return () => { clearInterval(t); window.removeEventListener("focus", load); };
  }, [load]);

  // close the list when clicking anywhere outside it
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const toggle = () => {
    if (!open) { setLoading(true); setError(""); api("/notifications").then((d) => setData({ unread: d.unread || 0, notifications: d.notifications || [] })).catch(() => {}).finally(() => setLoading(false)); }
    setOpen((o) => !o);
  };

  const markAll = async () => {
    try { await api("/notifications/read-all", { method: "POST" }); load(); } catch (e) { setError(e.message); }
  };

  const openNotification = async (n) => {
    setError("");
    try {
      if (!n.read) await api(`/notifications/${n.id}/read`, { method: "POST" });
      const full = await api(`/leads/${n.lead_id}`);
      setOpen(false);
      setLead(full);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="nb-wrap" ref={wrapRef}>
      <button type="button" className={`nb-bell${data.unread ? " has-unread" : ""}`} onClick={toggle}
              aria-label={`Notifications${data.unread ? ` (${data.unread} unread)` : ""}`} aria-expanded={open}
              title="Notifications">
        <span aria-hidden="true">🔔</span>
        {data.unread > 0 && <span className="nb-badge">{data.unread > 99 ? "99+" : data.unread}</span>}
      </button>

      {open && (
        <div className="nb-panel" role="dialog" aria-label="Notifications">
          <div className="nb-panel-head">
            <b>Notifications</b>
            {data.unread > 0 && <button type="button" className="ch-link" onClick={markAll}>Mark all as read</button>}
          </div>
          {error && <div className="error-msg" style={{ margin: "8px 12px" }}>{error}</div>}
          <div className="nb-list">
            {loading && data.notifications.length === 0 && <div className="nb-empty">Loading...</div>}
            {!loading && data.notifications.length === 0 && (
              <div className="nb-empty">No notifications yet. When the admin replies to one of your call remarks, it will show here.</div>
            )}
            {data.notifications.map((n) => (
              <button type="button" key={n.id} className={`nb-item${n.read ? "" : " unread"}`} onClick={() => openNotification(n)}>
                <div className="nb-item-top">
                  <span className="nb-title"><b>{n.from_name || "Admin"}</b> replied on <b>{n.lead_name}</b></span>
                  {!n.read && <span className="nb-dot" aria-label="unread"></span>}
                </div>
                <div className="nb-sub">{[n.project_name, fmtDateTime(n.created_at)].filter(Boolean).join(" · ")}</div>
                {n.remark && <div className="nb-remark">Your remark: “{n.remark}”</div>}
                <div className="nb-reply">{n.reply}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* the same Follow up form as the lead cards - reply is in Call history */}
      {lead && (
        <LeadModal
          lead={lead}
          telecallers={[]}
          isAdmin={false}
          onClose={() => { setLead(null); load(); }}
          onSaved={() => { setLead(null); load(); }}
        />
      )}
    </div>
  );
}
