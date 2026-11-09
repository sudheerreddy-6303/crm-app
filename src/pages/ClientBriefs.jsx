import React, { useCallback, useEffect, useRef, useState } from "react";
import { api, getUser, getToken, API_BASE } from "../api.js";
import { phoneText } from "../utils/maskPhone.js";
import { showPopup } from "../components/Popup.jsx";
import { copyToClipboard } from "../components/CopyNumbersButton.jsx";
import ExportButton from "../components/ExportButton.jsx";
import { fetchAllPages, downloadExcel } from "../utils/exportExcel.js";

// ADDED: "Client Briefs" page (sidebar). The Interior Design Client Brief form:
//  1. enter the client's name + WhatsApp number -> "Create link"
//  2. "Send on WhatsApp" opens WhatsApp with the message + the client's own link
//  3. the client fills the form on their phone and taps "Submit brief"
//  4. every answer + photo is saved in the database and shows here (View)
// Admin sees all briefs; a telecaller sees the briefs they created and the briefs
// of leads assigned to them. Export + Delete are admin only.

const PER_PAGE = 50;
const STATUS = {
  sent: { label: "Link sent", cls: "cb-st sent" },
  opened: { label: "Opened", cls: "cb-st opened" },
  submitted: { label: "Submitted", cls: "cb-st submitted" },
};
const fmtTs = (ts) => (ts ? new Date(Number(ts) * 1000).toLocaleString("en-IN", {
  timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
}) : "");

function cleanPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : "";
}

// the link the client opens (served by the backend)
export const briefLink = (token) => `${(API_BASE || window.location.origin).replace(/\/+$/, "")}/brief/${token}`;
const waMessage = (b) =>
  `Hello ${b.client_name}, greetings from Deeraj Interiors!\n\n` +
  `Please fill in your Interior Design Client Brief here:\n${briefLink(b.token)}\n\n` +
  `It takes about 15 minutes - tick what fits, write what matters. Our team will call you after reading it.\n\nThank you!`;
const waUrl = (b) => `https://wa.me/91${cleanPhone(b.phone)}?text=${encodeURIComponent(waMessage(b))}`;

function sendOnWhatsApp(b) {
  window.open(waUrl(b), "_blank", "noopener");
}
async function copyLink(b) {
  const ok = await copyToClipboard(briefLink(b.token));
  if (ok) showPopup("success", `The brief link for ${b.client_name} is copied. You can paste it anywhere.`, "Link copied");
  else showPopup("error", "Your browser blocked copying. Please try again.", "Could not copy");
}

// photo with the login token (same way as project images)
function BriefPhoto({ id, slot }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let alive = true; let made = "";
    fetch(`${API_BASE}/api/client-briefs/${id}/photos/${encodeURIComponent(slot)}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("no photo"))))
      .then((b) => { made = URL.createObjectURL(b); if (alive) setUrl(made); })
      .catch(() => {});
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [id, slot]);
  return (
    <figure className="cb-photo">
      {url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={`${slot} inspiration`} /></a> : <div className="cb-photo-wait">Loading…</div>}
      <figcaption>{slot}</figcaption>
    </figure>
  );
}

function BriefView({ id, onClose, onDeleted }) {
  const isAdmin = getUser()?.role === "admin";
  const [b, setB] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api(`/client-briefs/${id}`).then((d) => setB(d.brief)).catch((e) => setErr(e.message));
  }, [id]);

  const remove = async () => {
    if (!window.confirm(`Delete ${b.brief_no} (${b.client_name})? All answers and photos of this brief will be removed.`)) return;
    try {
      const d = await api(`/client-briefs/${id}`, { method: "DELETE" });
      showPopup("success", d.message || "Brief removed", "Brief deleted");
      onDeleted();
    } catch (e) { showPopup("error", e.message, "Could not delete"); }
  };
  const copyAnswers = async () => {
    const ok = await copyToClipboard(b.summary_text || "");
    if (ok) showPopup("success", "All answers of this brief are copied.", "Answers copied");
    else showPopup("error", "Your browser blocked copying. Please try again.", "Could not copy");
  };

  return (
    <div className="modal-overlay">
      <div className="modal cb-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} title="Close" aria-label="Close">×</button>
        {err && <p className="error">{err}</p>}
        {!b && !err && <p>Loading…</p>}
        {b && (
          <>
            <div className="cb-view-head">
              <div>
                <h2 style={{ margin: 0 }}>{b.filled_name || b.client_name}</h2>
                <div className="cb-view-sub">
                  {b.brief_no} · <span className={STATUS[b.status].cls}>{STATUS[b.status].label}</span>
                  {b.submitted_ts ? ` · submitted ${fmtTs(b.submitted_ts)}` : ""}
                  {b.submit_count > 1 ? ` · updated ${b.submit_count - 1} time${b.submit_count > 2 ? "s" : ""}` : ""}
                </div>
                <div className="cb-view-sub">
                  Sent to {phoneText(b.phone)} by {b.created_by_name || "-"} on {fmtTs(b.created_ts)}
                  {b.lead_name ? ` · Lead: ${b.lead_name}` : ""}
                </div>
              </div>
              <div className="cb-view-tools">
                {b.status === "submitted" && <button type="button" className="btn secondary small" onClick={copyAnswers}>📋 Copy answers</button>}
                {b.status === "submitted" && <button type="button" className="btn secondary small" onClick={() => window.print()}>🖨 Print</button>}
              </div>
            </div>

            {b.status !== "submitted" && (
              <div className="cb-wait">
                The client has {b.status === "opened" ? "opened the link but not submitted yet" : "not opened the link yet"}.
                <div className="cb-wait-btns">
                  <button type="button" className="btn small" onClick={() => sendOnWhatsApp(b)}>💬 Send again on WhatsApp</button>
                  <button type="button" className="btn small secondary" onClick={() => copyLink(b)}>🔗 Copy link</button>
                </div>
              </div>
            )}

            {b.photos && b.photos.length > 0 && (
              <div className="cb-section">
                <h3>Inspiration photos</h3>
                <div className="cb-photos">{b.photos.map((p) => <BriefPhoto key={p.slot} id={b.id} slot={p.slot} />)}</div>
              </div>
            )}
            {(b.answers || []).map((sec) => (
              <div className="cb-section" key={sec.section}>
                <h3>{sec.section}</h3>
                <dl className="cb-answers">
                  {sec.items.map((it, i) => (
                    <React.Fragment key={i}>
                      <dt>{it.q}</dt>
                      <dd>{/phone|whatsapp/i.test(it.q) ? phoneText(it.a) : it.a}</dd>
                    </React.Fragment>
                  ))}
                </dl>
              </div>
            ))}

            {isAdmin && (
              <div className="cb-danger">
                <button type="button" className="btn danger small" onClick={remove}>🗑 Delete this brief</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ClientBriefs() {
  const isAdmin = getUser()?.role === "admin";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [made, setMade] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ sent: 0, opened: 0, submitted: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [viewId, setViewId] = useState(null);
  const loadSeq = useRef(0);

  const load = useCallback(() => {
    const seq = ++loadSeq.current;
    const q = new URLSearchParams({ page, limit: PER_PAGE });
    if (search.trim()) q.set("search", search.trim());
    if (status) q.set("status", status);
    api(`/client-briefs?${q}`)
      .then((d) => { if (seq !== loadSeq.current) return; setRows(d.briefs || []); setTotal(d.total || 0); setCounts(d.counts || {}); })
      .catch(() => {});
  }, [page, search, status]);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) { showPopup("error", "Please enter the client name.", "Client name missing"); return; }
    if (!cleanPhone(phone)) { showPopup("error", "Please enter a valid 10-digit WhatsApp number (starting with 6, 7, 8 or 9).", "WhatsApp number not valid"); return; }
    setCreating(true);
    try {
      const d = await api("/client-briefs", { method: "POST", body: JSON.stringify({ client_name: name.trim(), phone }) });
      setMade(d.brief);
      setName(""); setPhone("");
      showPopup("success", `Link ready for ${d.brief.client_name}. Tap "Send on WhatsApp" to send it.`, "Brief link created");
      setPage(1); load();
    } catch (err) {
      showPopup("error", err.message, "Could not create the link");
    } finally {
      setCreating(false);
    }
  };

  const exportAll = async () => {
    const all = await fetchAllPages("/client-briefs", { search: search.trim(), status }, "briefs");
    const rowsX = [];
    for (const r of all) {
      let answers = [];
      if (r.status === "submitted") {
        try { answers = (await api(`/client-briefs/${r.id}`)).brief.answers || []; } catch { answers = []; }
      }
      const base = {
        "Brief no.": r.brief_no, "Client": r.client_name, "WhatsApp": r.phone, "Status": STATUS[r.status].label,
        "Name (filled)": r.filled_name, "Phone (filled)": r.filled_phone, "Email": r.email, "City & area": r.city_area,
        "Property type": r.property_type, "Configuration": r.configuration, "Budget": r.budget,
        "Lead": r.lead_name || "", "Created by": r.created_by_name || "", "Sent on": fmtTs(r.created_ts),
        "Submitted on": fmtTs(r.submitted_ts), "Link": briefLink(r.token),
      };
      answers.forEach((s) => s.items.forEach((it) => { base[`${s.section} | ${it.q}`] = it.a; }));
      rowsX.push(base);
    }
    return downloadExcel([{ name: "Client briefs", rows: rowsX }], "Client_briefs");
  };

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const allCount = (counts.sent || 0) + (counts.opened || 0) + (counts.submitted || 0);

  return (
    <div>
      <div className="sp-head">
        <div>
          <h1 className="page-title">📝 Client Briefs</h1>
          <p className="page-sub">Send the Interior Design Client Brief form to a client on WhatsApp - their answers are saved here</p>
        </div>
        <div className="sp-tools">{isAdmin && <ExportButton onExport={exportAll} />}</div>
      </div>

      <form className="card cb-new" onSubmit={create}>
        <label className="sp-label">Send a new client brief</label>
        <div className="cb-new-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" maxLength={150} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp number (10 digits)" inputMode="tel" maxLength={16} />
          <button type="submit" className="btn" disabled={creating}>{creating ? "Creating..." : "🔗 Create link"}</button>
        </div>
        <div className="sp-rule">A new private link is made for this client. If a lead has the same number, the brief is linked to that lead.</div>
        {made && (
          <div className="cb-made">
            <div className="cb-made-top"><b>{made.brief_no}</b> · {made.client_name} · {phoneText(made.phone)}{made.lead_name ? ` · Lead: ${made.lead_name}` : ""}</div>
            <div className="cb-link">{briefLink(made.token)}</div>
            <div className="cb-made-btns">
              <button type="button" className="btn cb-wa" onClick={() => sendOnWhatsApp(made)}>💬 Send on WhatsApp</button>
              <button type="button" className="btn secondary" onClick={() => copyLink(made)}>🔗 Copy link</button>
              <a className="btn secondary" href={briefLink(made.token)} target="_blank" rel="noreferrer">👁 Open form</a>
            </div>
          </div>
        )}
      </form>

      <div className="card">
        <div className="sp-list-head">
          <div className="cb-chips">
            {[["", `All (${allCount})`], ["submitted", `Submitted (${counts.submitted || 0})`], ["opened", `Opened (${counts.opened || 0})`], ["sent", `Link sent (${counts.sent || 0})`]].map(([k, l]) => (
              <button type="button" key={k || "all"} className={`cb-chip${status === k ? " on" : ""}`} onClick={() => { setPage(1); setStatus(k); }}>{l}</button>
            ))}
          </div>
          <input className="sp-search" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Search name, phone, brief no..." />
        </div>
        <div className="table-wrap">
          <table className="cb-table">
            <thead><tr><th>Brief no.</th><th>Client</th><th>WhatsApp</th><th>Status</th><th>Property / budget</th><th>Sent by</th><th>Sent on</th><th>Submitted on</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={9} className="empty">{search || status ? "No brief matches." : "No client brief sent yet. Create a link above."}</td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="cb-no">{r.brief_no}</td>
                  <td className="cb-client"><b>{r.filled_name || r.client_name}</b>{r.lead_name ? <div className="cb-small">Lead: {r.lead_name}</div> : null}{r.city_area ? <div className="cb-small">{r.city_area}</div> : null}</td>
                  <td className="cb-phone">{phoneText(r.phone)}</td>
                  <td className="cb-status"><span className={STATUS[r.status].cls}>{STATUS[r.status].label}</span></td>
                  <td className="cb-prop">{[r.property_type, r.configuration].filter(Boolean).join(" · ") || "-"}{r.budget ? <div className="cb-small">{r.budget}</div> : null}</td>
                  <td className="cb-by">{r.created_by_name || "-"}</td>
                  <td className="cb-on">{fmtTs(r.created_ts)}</td>
                  <td className="cb-sub">{fmtTs(r.submitted_ts) || "-"}</td>
                  <td className="cb-act">
                    <button type="button" className="btn small" onClick={() => setViewId(r.id)}>{r.status === "submitted" ? "View answers" : "View"}</button>
                    <button type="button" className="btn small secondary" title="Send on WhatsApp" onClick={() => sendOnWhatsApp(r)}>💬</button>
                    <button type="button" className="btn small secondary" title="Copy link" onClick={() => copyLink(r)}>🔗</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="pager" style={{ marginTop: 12 }}>
            <button className="btn small secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>« Prev</button>
            <span className="pager-info">Page {page} of {pages} · {total} briefs</span>
            <button className="btn small secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next »</button>
          </div>
        )}
      </div>

      {viewId && <BriefView id={viewId} onClose={() => { setViewId(null); load(); }} onDeleted={() => { setViewId(null); load(); }} />}
    </div>
  );
}
