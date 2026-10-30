// ORIGINAL: import React, { useCallback, useEffect, useState } from "react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { api, getUser } from "../api.js";
// ADDED: admin-only "Copy numbers" button
import CopyNumbersButton from "../components/CopyNumbersButton.jsx";
// ADDED: phone numbers hidden for telecallers (xxxxxxx789), full for admin
// UPDATED: + cardPhone (number hidden on the cards for everyone)
import { phoneText, cardPhone } from "../utils/maskPhone.js";
// ADDED: admin "Export to Excel" (shared helper + button)
import ExportButton from "../components/ExportButton.jsx";
import { fetchAllPages, downloadExcel, d10 } from "../utils/exportExcel.js";
// UPDATED: + DESIGNER_CATEGORY (Interior Designer extra details)
import ServiceCallModal, { SERVICE_CATEGORIES, DESIGNER_CATEGORY } from "../components/ServiceCallModal.jsx";
// ADDED: "Assign to" pop-up (admin only)
import ServiceCallAssignModal from "../components/ServiceCallAssignModal.jsx";
// ADDED: open the uploaded CV + pop-up on error
import { openCv } from "../utils/serviceCallCv.js";
import { showPopup } from "../components/Popup.jsx";
// ADDED: Excel/CSV import modal for service calls
import ServiceCallImportModal from "../components/ServiceCallImportModal.jsx";

// ADDED: WhatsApp helpers (same pattern as the Leads page).
// Builds a wa.me link that opens WhatsApp (mobile app on phones, WhatsApp Web /
// Desktop on computers) with the service call's number selected and a greeting
// message pre-typed. WhatsApp does not allow auto-send; the user taps send.
function waNumber(rawPhone) {
  // keep digits only
  let digits = String(rawPhone || "").replace(/\D/g, "");
  // A plain 10-digit Indian mobile needs the 91 country code.
  // Numbers that already include a country code (11-15 digits) are used as-is.
  if (digits.length === 10) digits = "91" + digits;
  return digits;
}
function waMessage(call) {
  const name = call.name ? ` ${call.name}` : "";
  const category = call.category ? ` regarding your *${call.category}* service request` : "";
  return `Hello${name}, this is Deeraj Interiors${category}. How can we help you today?`;
}
function openWhatsApp(call) {
  const num = waNumber(call.phone);
  if (!num || num.length < 11) {
    alert("This service call does not have a valid phone number for WhatsApp.");
    return;
  }
  const url = `https://wa.me/${num}?text=${encodeURIComponent(waMessage(call))}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// Small inline WhatsApp glyph so we don't add an icon dependency.
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.6 6L4 29l8.2-1.6c1.7.9 3.7 1.4 5.8 1.4h.001C24.6 28.8 30 23.4 30 16.8 30 9.4 24.6 3 16 3zm.02 22.3c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-4.9 1 1-4.8-.3-.4C5.4 18.6 5 16.8 5 15c0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-8.98 10.3zm5.5-7.5c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.4z"/>
    </svg>
  );
}

// UPDATED: was a "coming soon" placeholder - now a full Service Calls page:
// table of service calls, search + category filter, and a top-right
// "+ Add service call" button that opens the modal (Name, Phone number,
// Category dropdown, Location, Remarks).
// ADDED: page numbers to show - first, last, and 2 either side of the current
// page, with "…" for the gaps. e.g. 1 … 4 5 [6] 7 8 … 20
function pageList(current, totalPages) {
  const set = new Set([1, totalPages]);
  for (let p = current - 2; p <= current + 2; p++) if (p >= 1 && p <= totalPages) set.add(p);
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => { if (i > 0 && p - sorted[i - 1] > 1) out.push("…"); out.push(p); });
  return out;
}

export default function ServiceCalls() {
  const user = getUser();
  const isAdmin = user?.role === "admin";

  const [calls, setCalls] = useState([]);
  const [total, setTotal] = useState(0);
  // ORIGINAL: const [filters, setFilters] = useState({ search: "", category: "" });
  // UPDATED: + location and experience filters
  // ORIGINAL: const [filters, setFilters] = useState({ search: "", category: "", location: "", experience: "" });
  // UPDATED: + assigned ("" all, "none" not assigned, "me" mine, or telecaller id)
  const [filters, setFilters] = useState({ search: "", category: "", location: "", experience: "", assigned: "" });
  // ADDED: Assign pop-up (admin) + telecaller list for the "Assigned to" filter
  const [assignCall, setAssignCall] = useState(null);
  const [tcList, setTcList] = useState([]);
  useEffect(() => {
    if (!isAdmin) return;
    api("/users").then((rows) => setTcList((rows || []).filter((u) => u.role === "telecaller"))).catch(() => {});
  }, [isAdmin]);
  // ADDED: values for the Location / Experience dropdowns (from saved records)
  const [filterOptions, setFilterOptions] = useState({ locations: [], experiences: [] });
  // ADDED: categories added from the app (shown in the Categories filter too)
  const [customCats, setCustomCats] = useState([]);
  const loadCustomCats = () => api("/service-calls/categories").then((d) => setCustomCats((d.custom || []).map((c) => c.name))).catch(() => {});
  useEffect(() => { loadCustomCats(); }, []);
  useEffect(() => {
    api("/service-calls/filter-options").then((d) => setFilterOptions({ locations: d.locations || [], experiences: d.experiences || [] })).catch(() => {});
  }, []);
  const [page, setPage] = useState(1);
  // ORIGINAL: const limit = 50;  (now set below: 2 rows of cards per page, 50 in Table view)
  const [modalCall, setModalCall] = useState(null);
  // ADDED: controls the Excel/CSV import modal
  const [showImport, setShowImport] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  // ADDED: category count cards (e.g. how many Interior Designers, Electricians...)
  const [stats, setStats] = useState({ total: 0, categories: [] });
  const [showAllCats, setShowAllCats] = useState(false);
  // ADDED: Cards / Table switch - cards are the default, the original table is kept
  const [viewMode, setViewMode] = useState("cards");
  // ADDED: Cards view shows exactly 2 ROWS per page. The number of cards in a
  // row depends on the screen (3 on a computer, 1 on a phone), so it is measured
  // from the cards grid and the page size = cards per row x 2.
  const cardsGridRef = useRef(null);
  const [cardCols, setCardCols] = useState(() => (window.innerWidth <= 860 ? 1 : 3));
  useEffect(() => {
    const el = cardsGridRef.current;
    if (!el || viewMode !== "cards") return undefined;
    const measure = () => {
      const tracks = window.getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length;
      if (tracks > 0) setCardCols((c) => (c === tracks ? c : tracks));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el); else window.addEventListener("resize", measure);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener("resize", measure); };
  }, [viewMode]);
  const limit = viewMode === "cards" ? cardCols * 2 : 50;
  // when the page size changes (switching view / screen size) go back to page 1
  const prevLimit = useRef(limit);
  useEffect(() => {
    if (prevLimit.current !== limit) { prevLimit.current = limit; setPage(1); }
  }, [limit]);

  // ADDED: only the LATEST request may fill the cards. When the page size changes
  // (screen measured -> 6 becomes 8 cards) two requests run; an older, slower
  // answer used to overwrite the newer one, leaving page 1 not fully filled.
  const loadSeq = useRef(0);
  const load = useCallback(() => {
    const seq = ++loadSeq.current; // ADDED
    const q = new URLSearchParams({ page, limit });
    if (filters.search) q.set("search", filters.search);
    if (filters.category) q.set("category", filters.category);
    // ADDED
    if (filters.location) q.set("location", filters.location);
    if (filters.experience) q.set("experience", filters.experience);
    if (filters.assigned) q.set("assigned", filters.assigned); // ADDED
    api(`/service-calls?${q}`)
      // ORIGINAL: .then((d) => { setCalls(d.serviceCalls); setTotal(d.total); })
      .then((d) => { if (seq !== loadSeq.current) return; setCalls(d.serviceCalls); setTotal(d.total); })
      .catch((e) => setMsg({ type: "error", text: e.message }));
  // ORIGINAL: }, [page, filters]);
  }, [page, filters, limit]);

  useEffect(() => { load(); }, [load]);

  // ADDED: load per-category counts for the cards (whole table, not paginated)
  const loadStats = useCallback(() => {
    api("/service-calls/stats")
      .then((d) => setStats(d))
      .catch(() => {}); // cards are optional - don't block the page if this fails
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ADDED: clicking a card filters the table by that category (click again to clear)
  const pickCategory = (cat) => {
    setPage(1);
    setFilters({ ...filters, category: filters.category === cat ? "" : cat });
  };

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete service call for "${c.name}"?`)) return;
    try {
      await api(`/service-calls/${c.id}`, { method: "DELETE" });
      flash("success", "Service call deleted");
      load();
      loadStats(); // ADDED: refresh category cards
      return true; // ADDED: lets the form close after deleting
    } catch (e) {
      flash("error", e.message);
    }
  };

  // ADDED: export all service calls matching the search / category filter,
  // plus a second sheet with the per-category counts
  const exportAll = async () => {
    // ORIGINAL (full line): const rows = await fetchAllPages("/service-calls", { search: filters.search, category: filters.category, location: filters.location, experience: filters.experience }, "serviceCalls");
    const rows = await fetchAllPages("/service-calls", { search: filters.search, category: filters.category, location: filters.location, experience: filters.experience, assigned: filters.assigned }, "serviceCalls");
    return downloadExcel([
      { name: "Service calls", rows: rows.map((c) => ({
        "Name": c.name || "", "Phone number": c.phone || "", "Category": c.category || "",
        "City": c.city || "", "Location": c.location || "", "Experience": c.experience || "",
        "Remarks": c.remarks || "", "Added by": c.created_by_name || "", "Date": d10(c.created_at),
        // ADDED: assigned telecaller
        "Assigned to": c.assigned_to_name || "", "Assigned on": c.assigned_on || "",
        // ADDED: Interior Designer details
        "Experience (years)": c.exp_range || "", "Attended interview": c.interview_attended || "",
        "Currently working location": c.current_location || "", "Company": c.company_name || "",
        "Designation": c.designation || "", "Salary": c.salary || "", "CV": c.cv_name ? "Yes" : "",
        "Follow-up 1 date": d10(c.followup1_date), "Follow-up 1 remark": c.followup1_remark || "",
        "Follow-up 2 date": d10(c.followup2_date), "Follow-up 2 remark": c.followup2_remark || "",
        "Follow-up 3 date": d10(c.followup3_date), "Follow-up 3 remark": c.followup3_remark || "",
        // ADDED: last call (latest follow-up filled in)
        "Last call date": (lastCall(c) || {}).date || "", "Last call remark": (lastCall(c) || {}).remark || "",
      })) },
      { name: "Category counts", rows: [...stats.categories].sort((a, b) => b.count - a.count).map((c) => ({ "Category": c.category || c.name || "", "Count": Number(c.count || 0) })), numberCols: ["Count"] },
    ], filters.category ? `Service_calls_${filters.category}` : "Service_calls");
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  // ADDED: cards sorted by count (highest first); empty categories hidden
  // unless "Show all categories" is clicked
  const sortedCats = [...stats.categories].sort((a, b) => b.count - a.count);
  const visibleCats = showAllCats ? sortedCats : sortedCats.filter((c) => c.count > 0);
  const hiddenCount = sortedCats.length - sortedCats.filter((c) => c.count > 0).length;
  const fmt = (d) => (d ? String(d).slice(0, 10) : "");
  // ADDED: last call = the latest follow-up filled in (3, then 2, then 1)
  const lastCall = (c) => {
    const n = [3, 2, 1].find((k) => c[`followup${k}_date`] || c[`followup${k}_remark`]);
    return n ? { n, date: fmt(c[`followup${n}_date`]), remark: c[`followup${n}_remark`] || "" } : null;
  };

  return (
    <div>
      {/* Top row: title on the left, Add button on the top right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">🛠️ Service Calls</h1>
          <p className="page-sub">Track and manage customer service calls ({total} total)</p>
        </div>
        {/* ADDED: Import Excel button (admin only) - opens the import modal.
            Sits next to the existing "+ Add service call" button. */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* ADDED: Export to Excel (admin only) */}
          {isAdmin && <ExportButton onExport={exportAll} />}
          {/* ADDED: copy phone numbers (admin only) */}
          {/* ORIGINAL (full line): <CopyNumbersButton fields={["phone"]} getRows={() => fetchAllPages("/service-calls", { search: filters.search, category: filters.category, location: filters.location, experience: filters.experience }, "serviceCalls")} /> */}
          <CopyNumbersButton fields={["phone"]} getRows={() => fetchAllPages("/service-calls", { search: filters.search, category: filters.category, location: filters.location, experience: filters.experience, assigned: filters.assigned }, "serviceCalls")} />
          {isAdmin && (
            <button className="btn secondary" onClick={() => setShowImport(true)}>⬆️ Import Excel</button>
          )}
          <button className="btn" onClick={() => setModalCall({})}>+ Add service call</button>
        </div>
      </div>

      {msg.text && <div className={msg.type === "error" ? "error-msg" : "success-msg"}>{msg.text}</div>}

      {/* ADDED: category count cards - click a card to filter the table */}
      <div className="kpi-grid" style={{ marginBottom: 12 }}>
        <div
          className={`kpi clickable k-green${filters.category === "" ? " kpi-active" : ""}`}
          onClick={() => { setPage(1); setFilters({ ...filters, category: "" }); }}
          title="Show all categories"
        >
          <div className="label">All service calls</div>
          <div className="value">{stats.total}</div>
        </div>
        {visibleCats.map((c) => {
          // "Uncategorized" = rows with a blank category; it can't be used as a filter
          const canFilter = c.category !== "Uncategorized";
          return (
            <div
              key={c.category}
              className={`kpi${canFilter ? " clickable" : ""}${filters.category === c.category ? " kpi-active" : ""}`}
              onClick={canFilter ? () => pickCategory(c.category) : undefined}
              title={canFilter ? `Show only ${c.category}` : "Service calls without a category"}
              style={c.count === 0 ? { opacity: 0.6 } : undefined}
            >
              <div className="label">{c.category}</div>
              <div className="value">{c.count}</div>
            </div>
          );
        })}
      </div>
      {hiddenCount > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button className="btn small secondary" onClick={() => setShowAllCats(!showAllCats)}>
            {showAllCats ? "Hide empty categories" : `Show all categories (+${hiddenCount} with 0)`}
          </button>
        </div>
      )}

      <div className="filters">
        <input
          type="text"
          placeholder="Search name, phone or location..."
          value={filters.search}
          onChange={(e) => { setPage(1); setFilters({ ...filters, search: e.target.value }); }}
        />
        <select value={filters.category} onChange={(e) => { setPage(1); setFilters({ ...filters, category: e.target.value }); }}>
          <option value="">Categories</option>
          {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          {/* ADDED: categories added from the app */}
          {customCats.filter((c) => !SERVICE_CATEGORIES.includes(c)).map((c) => <option key={`c-${c}`} value={c}>{c}</option>)}
        </select>
        {/* ADDED: Location + Experience filters */}
        <select value={filters.location} onChange={(e) => { setPage(1); setFilters({ ...filters, location: e.target.value }); }} aria-label="Filter by location">
          <option value="">All locations</option>
          {filterOptions.locations.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={filters.experience} onChange={(e) => { setPage(1); setFilters({ ...filters, experience: e.target.value }); }} aria-label="Filter by experience">
          <option value="">All experience</option>
          {filterOptions.experiences.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        {/* ADDED: Assigned to filter - admin: any telecaller; telecaller: "Assigned to me" */}
        <select value={filters.assigned} onChange={(e) => { setPage(1); setFilters({ ...filters, assigned: e.target.value }); }} aria-label="Filter by assigned telecaller">
          <option value="">{isAdmin ? "Assigned to: all" : "All service calls"}</option>
          {isAdmin ? (<>
            <option value="none">Not assigned</option>
            {tcList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </>) : <option value="me">Assigned to me</option>}
        </select>
        {/* ORIGINAL: {(filters.location || filters.experience) && ( ... setFilters({ ...filters, location: "", experience: "" }) */}
          {/* ORIGINAL (full line): <button className="btn small secondary" onClick={() => { setPage(1); setFilters({ ...filters, location: "", experience: "" }); }}>✕ Clear</button> */}
        {(filters.location || filters.experience || filters.assigned) && (
          <button className="btn small secondary" onClick={() => { setPage(1); setFilters({ ...filters, location: "", experience: "", assigned: "" }); }}>✕ Clear</button>
        )}
        {/* ADDED: Cards / Table switch (same as the other pages) */}
        <div className="view-toggle" role="group" aria-label="View">
          <button className={`btn small ${viewMode === "cards" ? "" : "secondary"}`} onClick={() => setViewMode("cards")}>▦ Cards</button>
          <button className={`btn small ${viewMode === "table" ? "" : "secondary"}`} onClick={() => setViewMode("table")}>☰ Table</button>
        </div>
      </div>

      {/* ADDED: service call cards - same look as the other cards; phone number hidden (xxxxxxx789) */}
      {viewMode === "cards" && (
        <div className="lead-cards" ref={cardsGridRef}>
          {calls.length === 0 && <div className="card empty">No service calls yet. Click "+ Add service call" to create one.</div>}
          {calls.map((c) => (
            <div className="lead-card" key={`sc${c.id}`}>
              <div className="lc-head">
                <div style={{ minWidth: 0 }}>
                  <div className="lc-name">{c.name}</div>
                  <div className="lc-sub">{[c.location, c.city].filter(Boolean).join(", ") || "-"}</div>
                </div>
                {c.category && <span className="chip none">{c.category}</span>}
              </div>
              {/* ADDED: last call date + remark on every card */}
              {(() => {
                const lc = lastCall(c);
                return (
                  <div className={`sc-lastcall${lc ? "" : " none"}`}>
                    <div className="sc-lastcall-head">
                      <span>📞 Last call{lc ? ` (follow-up ${lc.n})` : ""}</span>
                      <b>{lc ? (lc.date || "Date not added") : "Not called yet"}</b>
                    </div>
                    {lc && <div className="sc-lastcall-remark">{lc.remark || "No remark"}</div>}
                  </div>
                );
              })()}
              <div className="lc-grid">
                <span>Phone number</span>
                <b>{c.phone ? (
                  <a className="wa-link" href={`https://wa.me/${waNumber(c.phone)}`} target="_blank" rel="noreferrer" title="Open WhatsApp chat">{cardPhone(c.phone)}</a>
                ) : "-"}</b>
                <span>Category</span><b>{c.category || "-"}</b>
                <span>City</span><b>{c.city || "-"}</b>
                <span>Location</span><b>{c.location || "-"}</b>
                <span>Experience</span><b>{c.experience || "-"}</b>
                {/* ADDED: Interior Designer details */}
                {c.category === DESIGNER_CATEGORY && (<>
                  <span>Experience (years)</span><b>{c.exp_range ? `${c.exp_range} years` : "-"}</b>
                  <span>Attended interview</span><b>{c.interview_attended || "-"}</b>
                  <span>Working location</span><b>{c.current_location || "-"}</b>
                  <span>Company</span><b>{c.company_name || "-"}</b>
                  <span>Designation</span><b>{c.designation || "-"}</b>
                  {isAdmin && (<><span>Salary</span><b>{c.salary || "-"}</b></>)}
                </>)}
                {/* ORIGINAL: <span>Added by</span><b>{c.created_by_name || "-"}</b> */}
                {/* ORIGINAL: <span>Date</span><b>{fmt(c.created_at) || "-"}</b> */}
                {/* UPDATED: "Date" row is now "Last call date"; the added date moved next to "Added by" */}
                <span>Added by</span><b>{c.created_by_name || "-"}{c.created_at ? ` · ${fmt(c.created_at)}` : ""}</b>
                <span>Last call date</span><b>{(lastCall(c) || {}).date || "-"}</b>
                {/* ADDED: assigned telecaller */}
                <span>Assigned to</span><b className={c.assigned_to_name ? "sc-assigned" : ""}>{c.assigned_to_name || "Not assigned"}</b>
              </div>
              {c.remarks && (
                <div className="lc-remarks"><div><span>Remarks:</span> {c.remarks}</div></div>
              )}
              {/* ADDED: Interior Designer follow-ups (only the ones filled in) */}
              {/* ORIGINAL: {c.category === DESIGNER_CATEGORY && [1, 2, 3].some(...) && (
                  UPDATED: follow-ups are shown for every category */}
              {/* ORIGINAL (full line): {c.category === DESIGNER_CATEGORY && [1, 2, 3].some((n) => c[`followup${n}_date`] || c[`followup${n}_remark`]) && ( */}
              {[1, 2, 3].some((n) => c[`followup${n}_date`] || c[`followup${n}_remark`]) && (
                <div className="sc-fu">
                  {[1, 2, 3].filter((n) => c[`followup${n}_date`] || c[`followup${n}_remark`]).map((n) => (
                    <div key={n}><span>Follow-up {n}{c[`followup${n}_date`] ? ` (${fmt(c[`followup${n}_date`])})` : ""}:</span> {c[`followup${n}_remark`] || "-"}</div>
                  ))}
                </div>
              )}
              <div className="lc-actions">
                <button className="btn small wa-btn" title="Send WhatsApp message" onClick={() => openWhatsApp(c)}>
                  <WhatsAppIcon /><span style={{ marginLeft: 6 }}>WhatsApp</span>
                </button>
                {/* ADDED: View CV (Interior Designers with a CV) */}
                {c.cv_name && (
                  <button className="btn small secondary" title={c.cv_name}
                          onClick={() => openCv(c.id).catch((e) => showPopup("error", e.message, "Could not open CV"))}>📄 CV</button>
                )}
                <button className="btn small secondary" onClick={() => setModalCall(c)}>Edit</button>
                {/* ADDED: Assign to telecaller - admin only */}
                {isAdmin && <button className="btn small secondary sc-assign-btn" onClick={() => setAssignCall(c)}>{c.assigned_to ? "Reassign" : "Assign"}</button>}
                {/* REMOVED from the card on request - Delete is now inside the Edit form (admin only):
                {isAdmin && <button className="btn small danger" onClick={() => remove(c)}>Delete</button>} */}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ORIGINAL table below - unchanged, shown in "Table" view */}
      {viewMode === "table" && (
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap sticky-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone number</th>
                <th>Category</th>
                {/* ADDED: City + Experience columns (populated by the Excel import) */}
                <th>City</th>
                <th>Location</th>
                <th>Experience</th>
                <th>Remarks</th>
                <th>Added by</th>
                <th>Date</th>
                {/* ADDED */}
                <th>Assigned to</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {/* ORIGINAL colSpan={10} - UPDATED 11 (+ Assigned to column) */}
                {/* ORIGINAL (full line): <tr><td colSpan={10} className="empty">No service calls yet. Click "+ Add service call" to create one.</td></tr> */}
              {calls.length === 0 && (
                <tr><td colSpan={11} className="empty">No service calls yet. Click "+ Add service call" to create one.</td></tr>
              )}
              {calls.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  {/* ORIGINAL: <td>{c.phone}</td> */}
                  <td>{phoneText(c.phone)}</td>
                  <td>{c.category || "-"}</td>
                  {/* ADDED: City + Experience cells */}
                  <td>{c.city || "-"}</td>
                  <td>{c.location || "-"}</td>
                  <td>{c.experience || "-"}</td>
                  <td>{c.remarks || "-"}</td>
                  <td>{c.created_by_name || "-"}</td>
                  <td>{fmt(c.created_at)}</td>
                  {/* ADDED */}
                  <td>{c.assigned_to_name || "-"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {/* ADDED: WhatsApp button - opens WhatsApp with number + message ready */}
                    <button
                      className="btn small wa-btn"
                      style={{ marginRight: 6 }}
                      title="Send WhatsApp message"
                      onClick={() => openWhatsApp(c)}
                    >
                      <WhatsAppIcon />
                    </button>
                    <button className="btn small secondary" onClick={() => setModalCall(c)}>Edit</button>
                    {/* ADDED: Assign - admin only */}
                    {isAdmin && (
                      <button className="btn small secondary" style={{ marginLeft: 6 }} onClick={() => setAssignCall(c)}>{c.assigned_to ? "Reassign" : "Assign"}</button>
                    )}
                    {isAdmin && (
                      <button className="btn small danger" style={{ marginLeft: 6 }} onClick={() => remove(c)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* ADDED: numbered pages for the Cards view (2 rows per page) */}
      {viewMode === "cards" && pages > 1 && (
        <div className="pager" role="navigation" aria-label="Pages">
          <button className="btn small secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>« Prev</button>
          {pageList(page, pages).map((p, i) => (p === "…"
            ? <span key={`gap${i}`} className="pager-gap">…</span>
            : <button key={p} className={`btn small ${p === page ? "" : "secondary"} pager-num`} aria-current={p === page ? "page" : undefined} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className="btn small secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next »</button>
          <span className="pager-info">Page {page} of {pages} · {total} service calls</span>
        </div>
      )}

      {/* ORIGINAL Prev / Next - kept for the Table view */}
      {viewMode === "table" && pages > 1 && (
        <div className="filters" style={{ marginTop: 12 }}>
          <button className="btn small secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span style={{ fontSize: 13 }}>Page {page} of {pages}</span>
          <button className="btn small secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {/* ADDED: Assign pop-up (admin only) */}
      {isAdmin && assignCall && (
        <ServiceCallAssignModal
          call={assignCall}
          onClose={() => setAssignCall(null)}
          onSaved={() => { setAssignCall(null); load(); }}
        />
      )}

      {modalCall && (
        <ServiceCallModal
          call={modalCall}
          // ADDED: Delete inside the form (admin only)
          onDelete={isAdmin ? async (rec) => { if (await remove(rec)) setModalCall(null); } : undefined}
          // ORIGINAL: onClose={() => setModalCall(null)}
          // UPDATED: refresh the category lists (a category may have been added)
          onClose={() => { setModalCall(null); loadCustomCats(); loadStats(); }}
          onSaved={() => {
            setModalCall(null);
            flash("success", modalCall.id ? "Service call updated" : "Service call added");
            load();
            loadStats(); // ADDED: refresh category cards
            loadCustomCats(); // ADDED: a new category may have been added
          }}
        />
      )}

      {/* ADDED: Excel/CSV import modal */}
      {showImport && (
        <ServiceCallImportModal
          onClose={() => setShowImport(false)}
          onImported={(data) => {
            setShowImport(false);
            flash("success", (data && data.message) || "Service calls imported");
            setPage(1);
            load();
            loadStats(); // ADDED: refresh category cards
          }}
        />
      )}
    </div>
  );
}
