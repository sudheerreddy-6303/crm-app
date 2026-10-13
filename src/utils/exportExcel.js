// ADDED: shared "Export to Excel" helpers (admin). Used by every page's
// Export button so all exports look and behave the same:
//  - fetchAllPages(): loads EVERY record matching the page's filters (all
//    pages, not just the 50 on screen), 200 at a time.
//  - downloadExcel(): writes one .xlsx file with one or more sheets.
//    Phone numbers / IDs are kept as text (no 9.85E+09); columns listed in
//    `numberCols` stay real numbers so Excel can total them.
import * as XLSX from "xlsx";
import { api } from "../api.js";

export async function fetchAllPages(path, params, listKey) {
  const all = [];
  const per = 200; // the API returns at most 200 per request
  for (let pg = 1; pg <= 2000; pg++) {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v !== "" && v !== null && v !== undefined) q.set(k, v); });
    q.set("page", pg); q.set("limit", per);
    const d = await api(`${path}?${q}`);
    const rows = (d && d[listKey]) || [];
    all.push(...rows);
    if (rows.length < per || (d && d.total !== undefined && all.length >= d.total)) break;
  }
  return all;
}

export const d10 = (v) => (v ? String(v).slice(0, 10) : "");

// sheets: [{ name, rows: [{Header: value}], numberCols: ["Header", ...] }]
export function downloadExcel(sheets, fileBase) {
  const wb = XLSX.utils.book_new();
  let total = 0;
  sheets.forEach((sh) => {
    const rows = sh.rows && sh.rows.length ? sh.rows : [{ Info: "No records" }];
    const ws = XLSX.utils.json_to_sheet(rows);
    const headers = Object.keys(rows[0]);
    const keepNum = new Set((sh.numberCols || []).map((h) => XLSX.utils.encode_col(headers.indexOf(h))));
    Object.keys(ws).forEach((k) => {
      if (k[0] === "!") return;
      const col = k.replace(/[0-9]+/g, "");
      if (ws[k].t === "n" && !keepNum.has(col)) { ws[k].t = "s"; ws[k].v = String(ws[k].v); }
    });
    ws["!cols"] = headers.map((h) => ({ wch: /remark|address|reply/i.test(h) ? 40 : Math.max(12, Math.min(30, h.length + 4)) }));
    XLSX.utils.book_append_sheet(wb, ws, String(sh.name || "Sheet").slice(0, 31));
    total += sh.rows ? sh.rows.length : 0;
  });
  const today = new Date().toISOString().slice(0, 10);
  const safe = String(fileBase || "Export").replace(/[^\w-]+/g, "_");
  const fileName = `${safe}_${today}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return { fileName, total };
}
