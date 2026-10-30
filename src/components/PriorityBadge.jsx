import React from "react";

// ADDED: clear Hot / Warm / Cold label shown next to the lead name
// (before, only a small coloured dot showed the priority). "none" shows nothing.
// ORIGINAL: const LABELS = { hot: "🔥 Hot", warm: "☀️ Warm", cold: "❄️ Cold" };
// UPDATED: + Dead
const LABELS = { hot: "🔥 Hot", warm: "☀️ Warm", cold: "❄️ Cold", dead: "⚫ Dead" };

export default function PriorityBadge({ priority }) {
  const p = String(priority || "").toLowerCase();
  if (!LABELS[p]) return null;
  return <span className={`prio-badge ${p}`} title={`Priority: ${p}`}>{LABELS[p]}</span>;
}
