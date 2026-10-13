import React, { useState } from "react";
import { showPopup } from "./Popup.jsx";

// ADDED: "Export to Excel" button used on every page (admin only - each page
// decides whether to show it). `onExport` builds and downloads the file and
// returns { total, fileName }. Shows a success / error pop-up afterwards.
export default function ExportButton({ onExport, label = "Export to Excel", className = "btn secondary" }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const res = (await onExport()) || {};
      showPopup("success", `${res.total ?? 0} row${res.total === 1 ? "" : "s"} exported to ${res.fileName || "Excel"}.`, "Exported to Excel");
    } catch (e) {
      showPopup("error", e.message || "Export failed", "Export failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className={className} onClick={run} disabled={busy} title="Download as an Excel file">
      {busy ? "Exporting..." : `⬇ ${label}`}
    </button>
  );
}
