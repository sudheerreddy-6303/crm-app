import React, { useState } from "react";
import * as XLSX from "xlsx";
import { api } from "../api.js";
import { SERVICE_CATEGORIES } from "./ServiceCallModal.jsx";

// ADDED: Service Calls Excel/CSV import modal - opened by the "Import Excel"
// button on the Service Calls page. Mirrors the Leads import (pages/ImportLeads.jsx)
// but is self-contained inside a modal so it lives inside the Service Calls section.
//
// Expected columns (header row, case-insensitive):
//   Fullname, Mobile number, city, location, experience, category
// Fullname and Mobile number are required; the rest are optional.

// Simple CSV parser that handles quoted fields (same as ImportLeads)
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

// Map the accepted Excel header names to our field names. Extra aliases are
// included so slightly different spellings still work.
const HEADER_MAP = {
  "fullname": "name",
  "full name": "name",
  "name": "name",
  "mobile number": "phone",
  "mobile": "phone",
  "phone": "phone",
  "phone number": "phone",
  "contact": "phone",
  "city": "city",
  "location": "location",
  "area": "location",
  "experience": "experience",
  "exp": "experience",
  "category": "category",
};

// Sample Excel the admin can download as a template. Uses the already-installed
// XLSX (SheetJS) library, so no new dependency.
function downloadSample() {
  const headers = ["Fullname", "Mobile number", "city", "location", "experience", "category"];
  const sampleRows = [
    ["Ravi Kumar", "9876543210", "Hyderabad", "Kondapur", "3 years", "Interior Designer"],
    ["Priya Sharma", "9123456780", "Hyderabad", "Gachibowli", "5 years", "Painter"],
    ["Anil Reddy", "9012345678", "Secunderabad", "Rezimental Bazar", "2 years", "Electrician"],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  // keep the phone column (B) as text so Excel does not turn it into 9.8765E+09
  for (let r = 1; r <= sampleRows.length; r++) {
    const cell = ws["B" + (r + 1)];
    if (cell) { cell.t = "s"; cell.v = String(cell.v); }
  }
  ws["!cols"] = [16, 15, 14, 18, 12, 18].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Service Calls");
  XLSX.writeFile(wb, "TeleCRM_Sample_ServiceCalls_Import.xlsx");
}

export default function ServiceCallImportModal({ onClose, onImported }) {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [importing, setImporting] = useState(false);

  // Shared processing for both Excel and CSV, once turned into an array-of-arrays.
  const processRows = (parsed) => {
    setRows([]);
    if (parsed.length < 2) {
      return setMsg({ type: "error", text: "The file needs a header row plus at least one data row." });
    }
    const headers = parsed[0].map((h) => HEADER_MAP[String(h ?? "").trim().toLowerCase()] || null);
    if (!headers.includes("name") || !headers.includes("phone")) {
      return setMsg({ type: "error", text: 'Could not find the "Fullname" and "Mobile number" columns. Check your header row (download the sample for reference).' });
    }

    const seenPhones = new Set();
    let duplicates = 0, invalid = 0;
    const mapped = parsed.slice(1).map((r) => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = String(r[i] ?? "").trim(); });
      obj.phone = (obj.phone || "").replace(/\D/g, "");
      return obj;
    }).filter((o) => {
      if (!o.name && !o.phone) return false;                       // empty row
      if (!o.name || o.phone.length < 10 || o.phone.length > 15) { invalid++; return false; } // missing name or bad phone
      if (seenPhones.has(o.phone)) { duplicates++; return false; } // duplicate phone in this file
      seenPhones.add(o.phone);
      return true;
    });

    setRows(mapped);
    const notes = [];
    if (invalid) notes.push(`${invalid} invalid row(s) (missing name or phone not 10-15 digits)`);
    if (duplicates) notes.push(`${duplicates} duplicate phone number(s) in the file`);
    const skippedNote = notes.length ? ` Skipped ${notes.join(", ")}.` : "";
    setMsg({ type: "success", text: `${mapped.length} valid row(s) ready to import.${skippedNote} Review the preview below.` });
  };

  const handleFile = (file) => {
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (isExcel) {
          const wb = XLSX.read(reader.result, { type: "array" });
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
      const data = await api("/service-calls/import", { method: "POST", body: JSON.stringify({ rows }) });
      onImported(data); // parent shows the flash + reloads the table + closes
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    // ORIGINAL: <div className="modal-overlay" onClick={onClose}>
    // UPDATED: clicking the empty space outside the form no longer closes it
    // (so typed data isn't lost by accident). Close with Cancel or after Save.
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760, width: "94%" }}>
        {/* ADDED: "X" close button (top-right) - closes the form without saving */}
        <button type="button" className="modal-close" onClick={onClose} title="Close" aria-label="Close">×</button>
        <h3>Import service calls from Excel</h3>
        <p className="page-sub">
          Upload an Excel file (.xlsx / .xls) or a CSV export. Recognised columns:{" "}
          <strong>Fullname, Mobile number, city, location, experience, category</strong>.
          Fullname and Mobile number are required. Empty rows, duplicate phone numbers, and
          phones not 10-15 digits are skipped automatically.
        </p>

        {msg.text && <div className={msg.type === "error" ? "error-msg" : "success-msg"}>{msg.text}</div>}

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "8px 0 4px" }}>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
          />
          <button type="button" className="btn secondary" onClick={downloadSample}>
            Download sample Excel
          </button>
        </div>

        {rows.length > 0 && (
          <div className="table-wrap" style={{ maxHeight: 320, overflowY: "auto", marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Fullname</th><th>Mobile number</th><th>City</th>
                  <th>Location</th><th>Experience</th><th>Category</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td>{r.phone}</td>
                    <td>{r.city || "-"}</td>
                    <td>{r.location || "-"}</td>
                    <td>{r.experience || "-"}</td>
                    <td>{r.category || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 100 && <p className="page-sub">Showing first 100 of {rows.length} rows.</p>}

        <div className="actions">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={doImport} disabled={importing || rows.length === 0}>
            {importing ? "Importing..." : rows.length ? `Import ${rows.length} service call(s)` : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
