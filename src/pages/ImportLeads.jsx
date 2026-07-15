import React, { useState } from "react";
import * as XLSX from "xlsx";
import { api } from "../api.js";

// Simple CSV parser that handles quoted fields
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((c) => c.trim() !== "")) rows.push(row); }
  return rows;
}

// ADDED: sample Excel file the admin can download as a reference / template.
// Uses the already-imported XLSX (SheetJS) library, so no new dependencies.
// Only "Name" and "Primary Phone" are mandatory; every other column is optional.
function downloadSample() {
  const sampleHeaders = [
    "Name", "Primary Phone", "1st Calling date", "2nd Calling date",
    "Call Category", "Quote Sent", "Order Booked", "WhatsApp date",
    "WhatsApp Category", "Calling remark", "Next call date",
    // ADDED: assign leads to telecallers during import (name or email)
    "Telecaller",
  ];
  const sampleRows = [
    ["Ravi Kumar", "9876543210", "2026-07-10", "2026-07-12", "INTERESTED", "Yes", "No", "2026-07-12", "Catalogue sent", "Wants modular kitchen quote", "2026-07-18", "sakshi"],
    ["Priya Sharma", "9123456780", "2026-07-11", "", "FOLLOW UP", "No", "No", "", "", "Asked to call back next week", "2026-07-20", "sakshi"],
    ["Anil Reddy", "9012345678", "2026-07-09", "2026-07-14", "NOT ANSWERED", "No", "No", "", "", "Phone switched off", "2026-07-16", ""],
    ["Sunitha Rao", "9988776655", "2026-07-08", "", "NOT INTERESTED", "No", "No", "2026-07-08", "Intro message", "Already completed interiors work", "", ""],
    ["Mohammed Irfan", "9090909090", "", "", "", "", "", "", "", "", "", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleRows]);
  // Keep the phone column as text so Excel does not turn numbers into 9.8765E+09
  for (let r = 1; r <= sampleRows.length; r++) {
    const cell = ws["B" + (r + 1)];
    if (cell) { cell.t = "s"; cell.v = String(cell.v); }
  }
  ws["!cols"] = [16, 15, 16, 16, 16, 11, 13, 15, 18, 32, 14, 14].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Leads");
  XLSX.writeFile(wb, "TeleCRM_Sample_Leads_Import.xlsx");
}

// Map common Excel header names to our field names
const HEADER_MAP = {
  "name": "name",
  "lead name": "name",
  "customer name": "name",
  "primary phone": "primary_phone",
  "phone": "primary_phone",
  "mobile": "primary_phone",
  "1st calling date": "first_calling_date",
  "first calling date": "first_calling_date",
  "2nd calling date": "second_calling_date",
  "second calling date": "second_calling_date",
  "call catrgory": "call_category",
  "call category": "call_category",
  "quote sent": "quote_sent",
  "order booked": "order_booked",
  "latest date whats app message sent": "whatsapp_sent_date",
  "whatsapp date": "whatsapp_sent_date",
  "whatsapp catgeroy": "whatsapp_category",
  "whatsapp category": "whatsapp_category",
  "calling remark": "calling_remark",
  "remark": "calling_remark",
  "next call date": "next_call_date",
  "source": "source",
  // ADDED: telecaller assignment column - accepts the telecaller's name or email.
  // The backend looks the value up in the users table and assigns the lead.
  "telecaller": "assigned_to_name",
  "assigned to": "assigned_to_name",
  "assigned telecaller": "assigned_to_name",
  "caller": "assigned_to_name",
  "caller name": "assigned_to_name",
};

// Convert Excel-style dates like "30-Nov" or "15-Jan-2026" to YYYY-MM-DD
const MONTHS = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
function toIsoDate(v) {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  let m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ]?(\d{2,4})?$/); // 30-Nov / 15-Jan-2026
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mon) {
      let year = m[3] ? (m[3].length === 2 ? `20${m[3]}` : m[3]) : String(new Date().getFullYear());
      return `${year}-${mon}-${String(m[1]).padStart(2, "0")}`;
    }
  }
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/); // 30/11/2025 (assumes DD/MM/YYYY)
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }
  return "";
}

export default function ImportLeads() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [importing, setImporting] = useState(false);

  // ORIGINAL CODE (only supported CSV files - Excel .xlsx uploads were rejected):
  // const handleFile = (file) => {
  //   const reader = new FileReader();
  //   reader.onload = () => {
  //     const parsed = parseCSV(String(reader.result));
  //     ... (processing moved into processRows below, unchanged logic)
  //   };
  //   reader.readAsText(file);
  // };
  // FIXED: accepts Excel (.xlsx / .xls) directly via SheetJS, plus CSV as before.
  // Shared processing for both formats:
  const processRows = (parsed) => {
    if (parsed.length < 2) {
      return setMsg({ type: "error", text: "The file needs a header row plus at least one data row." });
    }
    const headers = parsed[0].map((h) => HEADER_MAP[String(h ?? "").trim().toLowerCase()] || null);
    if (!headers.includes("name") || !headers.includes("primary_phone")) {
      return setMsg({ type: "error", text: 'Could not find "Name" and "Primary Phone" columns. Check your header row.' });
    }
    const seenPhones = new Set();
    let duplicates = 0, invalid = 0;
    const mapped = parsed.slice(1).map((r) => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = String(r[i] ?? "").trim(); });
      obj.first_calling_date = toIsoDate(obj.first_calling_date);
      obj.second_calling_date = toIsoDate(obj.second_calling_date);
      obj.whatsapp_sent_date = toIsoDate(obj.whatsapp_sent_date);
      obj.next_call_date = toIsoDate(obj.next_call_date);
      obj.primary_phone = (obj.primary_phone || "").replace(/\D/g, "");
      const cat = (obj.call_category || "").toUpperCase();
      obj.call_category = ["NOT INTERESTED", "FOLLOW UP", "INTERESTED", "NOT ANSWERED"].includes(cat) ? cat : "";
      obj.quote_sent = /^y/i.test(obj.quote_sent || "") ? "Yes" : /^n/i.test(obj.quote_sent || "") ? "No" : "";
      obj.order_booked = /^y/i.test(obj.order_booked || "") ? "Yes" : /^n/i.test(obj.order_booked || "") ? "No" : "";
      return obj;
    }).filter((o) => {
      if (!o.name && !o.primary_phone) return false;            // empty row
      if (!o.name || o.primary_phone.length < 10) { invalid++; return false; } // missing name or bad phone
      if (seenPhones.has(o.primary_phone)) { duplicates++; return false; }     // duplicate phone
      seenPhones.add(o.primary_phone);
      return true;
    });
    setRows(mapped);
    const skippedNote = (invalid || duplicates)
      ? ` Skipped ${invalid} invalid row(s) (missing name or phone shorter than 10 digits) and ${duplicates} duplicate phone number(s).`
      : "";
    setMsg({ type: "success", text: `${mapped.length} valid row(s) ready to import.${skippedNote} Review the preview below.` });
  };

  const handleFile = (file) => {
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (isExcel) {
          const wb = XLSX.read(reader.result, { type: "array" });
          // use the first sheet that actually has data
          let aoa = [];
          for (const name of wb.SheetNames) {
            const candidate = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: "" });
            if (candidate.length > 1) { aoa = candidate; break; }
          }
          processRows(aoa);
        } else {
          processRows(parseCSV(String(reader.result)));
        }
      } catch (e) {
        setMsg({ type: "error", text: `Could not read the file: ${e.message}` });
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  };

  const doImport = async () => {
    setImporting(true);
    setMsg({ type: "", text: "" });
    try {
      const data = await api("/leads/import", { method: "POST", body: JSON.stringify({ rows }) });
      setMsg({ type: "success", text: data.message });
      setRows([]);
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Import leads</h1>
      <p className="page-sub">
        {/* ORIGINAL: CSV only. Now supports Excel (.xlsx / .xls) directly plus CSV. */}
        Upload your Excel file (.xlsx / .xls) directly, or a CSV export.
        Recognised columns: Name, Primary Phone, 1st Calling date, 2nd Calling date, Call Category,
        Quote Sent, Order Booked, WhatsApp date, WhatsApp Category, Calling remark, Next call date.
        {/* ADDED: telecaller assignment support during import */}
        {" "}You can also add a <strong>Telecaller</strong> column (telecaller's name or email) to
        assign each lead while importing.
        Empty rows, duplicate phone numbers, and phones shorter than 10 digits are skipped automatically.
      </p>

      {msg.text && <div className={msg.type === "error" ? "error-msg" : "success-msg"}>{msg.text}</div>}

      <div className="card">
        <input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        />
        {/* ADDED: reference sample file for admins. Generated in the browser, nothing to host. */}
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={downloadSample}>
            Download sample Excel
          </button>
          <span className="page-sub" style={{ margin: 0 }}>
            Reference file with all recognised columns. Only Name and Primary Phone are mandatory.
          </span>
        </div>
      </div>

      {rows.length > 0 && (
        <>
          <div className="card import-preview" style={{ padding: 0 }}>
            <div className="table-wrap" style={{ maxHeight: 420, overflowY: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Phone</th><th>1st call</th><th>Category</th>
                    <th>Quote</th><th>Order</th><th>WA date</th><th>WA cat</th><th>Remark</th><th>Telecaller</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((r, i) => (
                    <tr key={i}>
                      <td>{r.name}</td><td>{r.primary_phone}</td><td>{r.first_calling_date || "-"}</td>
                      <td>{r.call_category || "-"}</td><td>{r.quote_sent || "-"}</td><td>{r.order_booked || "-"}</td>
                      <td>{r.whatsapp_sent_date || "-"}</td><td>{r.whatsapp_category || "-"}</td>
                      <td className="remark">{r.calling_remark || "-"}</td><td>{r.assigned_to_name || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {rows.length > 100 && <p className="page-sub">Showing first 100 of {rows.length} rows.</p>}
          <button className="btn" onClick={doImport} disabled={importing}>
            {importing ? "Importing..." : `Import ${rows.length} lead(s)`}
          </button>
        </>
      )}
    </div>
  );
}
