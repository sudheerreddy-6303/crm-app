import React, { useEffect, useMemo, useRef, useState } from "react";

// ADDED: dropdown that lets you tick several values (used by the Project details
// State / City / Location filters). Shows "All states" when nothing is ticked,
// the value when one is ticked, or "2 states" when more. Has a search box for
// long lists, "Select all" / "Clear", and closes when you click outside.
export default function MultiSelect({ label, plural, options, value, onChange, emptyText = "No options" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  useEffect(() => { if (!open) setQ(""); }, [open]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.toLowerCase().includes(s)) : options;
  }, [options, q]);

  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  const text = value.length === 0 ? `All ${plural}` : value.length === 1 ? value[0] : `${value.length} ${plural}`;

  return (
    <div className={`msel-wrap${open ? " open" : ""}${value.length ? " on" : ""}`} ref={ref}>
      <button type="button" className="msel-btn" onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} title={value.join(", ") || `All ${plural}`}>
        <span className="msel-label">{label}</span>
        <span className="msel-text">{text}</span>
        <span className="msel-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="msel-panel" role="listbox" aria-multiselectable="true">
          {options.length > 8 && (
            <input className="msel-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${plural}...`} />
          )}
          <div className="msel-actions">
            <button type="button" onClick={() => onChange([...new Set([...value, ...shown])])} disabled={!shown.length}>Select all</button>
            <button type="button" onClick={() => onChange([])} disabled={!value.length}>Clear</button>
          </div>
          <div className="msel-list">
            {shown.length === 0 && <div className="msel-empty">{options.length ? "No match" : emptyText}</div>}
            {shown.map((o) => (
              <label key={o} className="msel-opt">
                <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
                <span>{o}</span>
              </label>
            ))}
          </div>
          <div className="msel-foot">
            <span>{value.length ? `${value.length} selected` : "None selected - showing all"}</span>
            <button type="button" className="btn small" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
