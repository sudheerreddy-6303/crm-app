import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api, getUser } from "../api.js";
import { phoneText } from "../utils/maskPhone.js";
import { showPopup } from "../components/Popup.jsx";
import CopyNumbersButton from "../components/CopyNumbersButton.jsx";
import ExportButton from "../components/ExportButton.jsx";
import { fetchAllPages, downloadExcel } from "../utils/exportExcel.js";

// ADDED: "Store Promotions" pages - opened from the sidebar Store Promotions menu
// (Suchitra / Nanakramguda). One page component, the store comes from the route.
// UPDATED: add many phone numbers at a time. Only valid numbers are saved and
// a number is saved only once per store (the database also blocks duplicates).
export const STORES = { suchitra: "Suchitra", nanakramguda: "Nanakramguda" };

// same rule as the server: 10 digits starting 6-9; +91 / 91 / 0 in front is removed
export function cleanPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : "";
}
// one entry per line / comma / semicolon. An entry like "+91 90000 12345" is ONE number;
// if the whole entry is not a valid number, it is split on spaces ("7000000001 8000000002").
export function splitNumbers(text) {
  const out = [];
  String(text || "").split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean).forEach((entry) => {
    if (cleanPhone(entry)) out.push(entry);
    else entry.split(/\s+/).filter(Boolean).forEach((t) => out.push(t));
  });
  return out;
}
const fmtTs = (ts) => (ts ? new Date(Number(ts) * 1000).toLocaleString("en-IN", {
  timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
}) : "-");
const PER_PAGE = 50;

// ORIGINAL placeholder lines (kept for reference):
//   import React from "react";
//   // Placeholder: the menu and routes are ready; the promotion details will be added here.
// ORIGINAL placeholder page (kept for reference):
// export default function StorePromotions({ store }) {
//   const name = STORES[store] || store;
//   return (
//     <div>
//       <h1 className="page-title">🏬 Store Promotions — {name}</h1>
//       <p className="page-sub">Promotions for the {name} store</p>
//       <div className="card sp-empty">
//         <div className="sp-empty-icon" aria-hidden="true">🏬</div>
//         <b>{name} store promotions</b>
//         <span>This page is ready. The promotion details for {name} will show here.</span>
//       </div>
//     </div>
//   );
// }

export default function StorePromotions({ store }) {
  const name = STORES[store] || store;
  const isAdmin = getUser()?.role === "admin";
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // live check of what is typed / pasted
  const check = useMemo(() => {
    const parts = splitNumbers(text);
    const seen = new Set(); const valid = []; const invalid = []; let repeated = 0;
    parts.forEach((p) => {
      const c = cleanPhone(p);
      if (!c) invalid.push(p);
      else if (seen.has(c)) repeated++;
      else { seen.add(c); valid.push(c); }
    });
    return { total: parts.length, valid, invalid, repeated };
  }, [text]);

  const load = useCallback(() => {
    const q = new URLSearchParams({ page, limit: PER_PAGE });
    if (search.replace(/\D/g, "")) q.set("search", search.replace(/\D/g, ""));
    api(`/store-promotions/${store}/numbers?${q}`)
      .then((d) => { setRows(d.numbers || []); setTotal(d.total || 0); })
      .catch(() => {});
  }, [store, page, search]);
  useEffect(() => { load(); }, [load]);
  // new store page -> start fresh
  useEffect(() => { setText(""); setLastResult(null); setPage(1); setSearch(""); }, [store]);

  const add = async () => {
    if (!check.valid.length) {
      showPopup("error", "No valid phone numbers. A valid number has 10 digits and starts with 6, 7, 8 or 9.", "Nothing to add");
      return;
    }
    setAdding(true);
    try {
      const d = await api(`/store-promotions/${store}/numbers`, { method: "POST", body: JSON.stringify({ numbers: check.valid }) });
      showPopup("success", d.message || "Numbers added", "Numbers added");
      setLastResult({ added: d.added || 0, already: d.already || 0, invalid: check.invalid, repeated: check.repeated });
      setText(check.invalid.join("\n")); // keep only the invalid ones, so they can be corrected
      setPage(1); load();
    } catch (e) {
      // e.g. every number is already in the list
      showPopup("error", e.message, /already/.test(e.message) ? "Nothing new to add" : "Could not add numbers");
    } finally {
      setAdding(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Remove ${r.phone} from the ${name} list?`)) return;
    try {
      await api(`/store-promotions/${store}/numbers/${r.id}`, { method: "DELETE" });
      showPopup("success", `${r.phone} removed from the ${name} list`, "Number removed");
      load();
    } catch (e) { showPopup("error", e.message, "Could not remove"); }
  };

  const allRows = () => fetchAllPages(`/store-promotions/${store}/numbers`, {}, "numbers");
  const exportAll = async () => downloadExcel([{
    name: `${name} numbers`,
    rows: (await allRows()).map((r) => ({ "Phone number": r.phone, "Added by": r.added_by || "", "Added on": fmtTs(r.created_ts) })),
  }], `Store_promotions_${name}`);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      <div className="sp-head">
        <div>
          <h1 className="page-title">🏬 Store Promotions — {name}</h1>
          <p className="page-sub">Phone numbers for {name} store promotions</p>
        </div>
        {isAdmin && (
          <div className="sp-tools">
            <ExportButton onExport={exportAll} />
            <CopyNumbersButton fields={["phone"]} getRows={allRows} />
          </div>
        )}
      </div>

      <div className="card sp-add">
        <label className="sp-label">Add phone numbers</label>
        <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={"Paste or type many numbers - one per line, or separated by commas / spaces\ne.g. 9849012345, +91 90000 12345"} />
        {check.total > 0 && (
          <div className="sp-check">
            <span className="ok">✓ {check.valid.length} valid</span>
            {check.repeated > 0 && <span className="rep">↺ {check.repeated} repeated (counted once)</span>}
            {check.invalid.length > 0 && <span className="bad">✕ {check.invalid.length} invalid</span>}
          </div>
        )}
        {check.invalid.length > 0 && (
          <div className="sp-invalid">Invalid: {check.invalid.slice(0, 12).join(", ")}{check.invalid.length > 12 ? ` … +${check.invalid.length - 12} more` : ""}</div>
        )}
        <div className="sp-actions">
          <span className="sp-rule">Only 10-digit mobile numbers starting with 6-9 are saved. A number already in the {name} list is not added again.</span>
          <button type="button" className="btn" disabled={adding || !check.valid.length} onClick={add}>
            {adding ? "Adding..." : `Add ${check.valid.length || ""} number${check.valid.length === 1 ? "" : "s"}`}
          </button>
        </div>
        {lastResult && (
          <div className="sp-result">
            Last add: <b>{lastResult.added} added</b>
            {lastResult.already ? ` · ${lastResult.already} already in the list (skipped)` : ""}
            {lastResult.repeated ? ` · ${lastResult.repeated} repeated (counted once)` : ""}
            {lastResult.invalid.length ? ` · ${lastResult.invalid.length} invalid (left in the box to correct)` : ""}
          </div>
        )}
      </div>

      <div className="card">
        <div className="sp-list-head">
          <h3 style={{ margin: 0 }}>{name} numbers <span className="wa-history-count">{total}</span></h3>
          <input className="sp-search" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Search number..." inputMode="numeric" />
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Phone number</th><th>Added by</th><th>Added on</th>{isAdmin && <th></th>}</tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={isAdmin ? 5 : 4} className="empty">{search ? "No number matches the search." : `No numbers added for ${name} yet.`}</td></tr>}
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td>{(page - 1) * PER_PAGE + i + 1}</td>
                  <td>{phoneText(r.phone)}</td>
                  <td>{r.added_by || "-"}</td>
                  <td>{fmtTs(r.created_ts)}</td>
                  {isAdmin && <td><button className="btn small danger" onClick={() => remove(r)}>Remove</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="pager" style={{ marginTop: 12 }}>
            <button className="btn small secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>« Prev</button>
            <span className="pager-info">Page {page} of {pages} · {total} numbers</span>
            <button className="btn small secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next »</button>
          </div>
        )}
      </div>
    </div>
  );
}
