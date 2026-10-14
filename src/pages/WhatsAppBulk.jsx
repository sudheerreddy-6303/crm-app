// ORIGINAL: import React from "react";
import React, { useState } from "react";
// ADDED: Telecaller name / Projects (multi-select) / Count form
import WhatsAppForm from "../components/WhatsAppForm.jsx";
// ADDED: saved requests history (from the database)
import WhatsAppHistory from "../components/WhatsAppHistory.jsx";

// ADDED: your Bulk WhatsApp website, opened INSIDE this page (top-right icon).
// Can be changed without code by setting REACT_APP_BULK_WHATSAPP_URL in .env
const BULK_WA_URL = process.env.REACT_APP_BULK_WHATSAPP_URL || "http://46.4.81.215/login";

// ADDED: "Bulk WhatsApp" page - opened from the sidebar WhatsApp menu.
// Placeholder page: the menu and route are ready; the bulk-messaging
// features will be added here.
export default function WhatsAppBulk() {
  // ADDED: bumps after each save so the history list reloads
  const [reloadKey, setReloadKey] = useState(0);
  // ADDED: Bulk WhatsApp website panel open / closed
  const [siteOpen, setSiteOpen] = useState(false);
  // Browsers block an http:// site inside an https:// page (mixed content)
  const blocked = window.location.protocol === "https:" && BULK_WA_URL.startsWith("http:");
  return (
    <div>
      {/* ORIGINAL: <h1 className="page-title">📢 Bulk WhatsApp</h1>
          ORIGINAL: <p className="page-sub">Send one WhatsApp message to many contacts</p>
          UPDATED: same title + sub-title, plus the WhatsApp icon on the right */}
      <div className="bw-head">
        <div>
          <h1 className="page-title">📢 Bulk WhatsApp</h1>
          <p className="page-sub">Send one WhatsApp message to many contacts</p>
        </div>
        {/* ORIGINAL: <button type="button" className="bw-icon-btn" onClick={() => setSiteOpen(true)} ...> (opened the site inside this page)
            UPDATED: opens the Bulk WhatsApp site in the next (new) browser tab */}
        <a className="bw-icon-btn" href={BULK_WA_URL} target="_blank" rel="noopener noreferrer" title="Open Bulk WhatsApp" aria-label="Open Bulk WhatsApp">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path fill="currentColor" d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5Zm0 17.2c-1.5 0-2.9-.4-4.1-1.1l-.3-.2-2.8.8.8-2.7-.2-.3A7.7 7.7 0 1 1 12 19.7Zm4.3-5.7c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.3 6.3 0 0 1-3.1-2.7c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1l-.6-.2Z"/>
          </svg>
        </a>
      </div>

      {/* ADDED: Bulk WhatsApp website shown inside our website */}
      {siteOpen && (
        <div className="bw-panel" role="dialog" aria-label="Bulk WhatsApp website">
          <div className="bw-bar">
            <span className="bw-bar-title">💬 Bulk WhatsApp</span>
            <div className="bw-bar-actions">
              <a className="btn small secondary" href={BULK_WA_URL} target="_blank" rel="noopener noreferrer">Open in new tab ↗</a>
              <button type="button" className="btn small" onClick={() => setSiteOpen(false)}>✕ Close</button>
            </div>
          </div>
          {blocked ? (
            <div className="bw-blocked">
              <div className="wa-placeholder-icon">🔒</div>
              <h3>This page can't be shown inside the CRM</h3>
              <p>The Bulk WhatsApp site uses <b>http://</b> but the CRM uses secure <b>https://</b>, so the browser blocks it here. Add an https:// address (domain + SSL) for the Bulk WhatsApp site and it will open inside the CRM. Until then, use "Open in new tab".</p>
              <a className="btn" href={BULK_WA_URL} target="_blank" rel="noopener noreferrer">Open in new tab ↗</a>
            </div>
          ) : (
            <iframe className="bw-frame" src={BULK_WA_URL} title="Bulk WhatsApp" />
          )}
        </div>
      )}
      {/* ORIGINAL placeholder card (replaced by the form below):
      <div className="card wa-placeholder">
        <div className="wa-placeholder-icon">📢</div>
        <h3>Bulk WhatsApp is being set up</h3>
        <p>This section will let you pick a group of leads (for example by project or category) and send them a WhatsApp message together.</p>
      </div>
      */}
      {/* ORIGINAL: <WhatsAppForm channel="Bulk WhatsApp" /> */}
      <WhatsAppForm channel="Bulk WhatsApp" channelKey="bulk" onSaved={() => setReloadKey((k) => k + 1)} />
      {/* ADDED: history */}
      <WhatsAppHistory channel="Bulk WhatsApp" channelKey="bulk" reloadKey={reloadKey} />
    </div>
  );
}
