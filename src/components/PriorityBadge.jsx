import React from "react";

// ADDED: clear Hot / Warm / Cold label shown next to the lead name
// (before, only a small coloured dot showed the priority). "none" shows nothing.
const LABELS = { hot: "🔥 Hot", warm: "☀️ Warm", cold: "❄️ Cold" };

export default function PriorityBadge({ priority }) {
  const p = String(priority || "").toLowerCase();
  if (!LABELS[p]) return null;
  return <span className={`prio-badge ${p}`} title={`Priority: ${p}`}>{LABELS[p]}</span>;
}
