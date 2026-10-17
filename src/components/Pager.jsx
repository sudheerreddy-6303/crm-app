import React, { useEffect, useRef, useState } from "react";

// ADDED: shared "2 rows of cards per page + page numbers" helpers.
//
// useTwoRowLimit(active, setPage, fallback)
//   - active   : true while the cards are showing
//   - setPage  : the page's setPage (goes back to page 1 when the size changes)
//   - fallback : page size when the cards are NOT showing (table view) - default 50
//   Returns { gridRef, limit }. Put ref={gridRef} on the cards container.
//   The number of cards in one row depends on the screen (3 on a computer,
//   1 on a phone...). It is measured from the cards container, and
//   limit = cards per row x 2  ->  exactly 2 rows per page.
export function useTwoRowLimit(active, setPage, fallback = 50) {
  const [el, setEl] = useState(null);
  const [cols, setCols] = useState(() => (typeof window !== "undefined" && window.innerWidth <= 860 ? 1 : 3));

  useEffect(() => {
    if (!el || !active) return undefined;
    const measure = () => {
      let n = 0;
      // CSS grid (lead cards): count the column tracks
      const tracks = window.getComputedStyle(el).gridTemplateColumns;
      if (tracks && tracks !== "none") n = tracks.split(" ").filter(Boolean).length;
      // Bootstrap row (project cards): container width / one card width
      if (!n) {
        const first = el.firstElementChild;
        if (first && first.offsetWidth > 0) n = Math.max(1, Math.round(el.clientWidth / first.offsetWidth));
      }
      if (n > 0) setCols((c) => (c === n ? c : n));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el); else window.addEventListener("resize", measure);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener("resize", measure); };
  }, [el, active]);

  const limit = active ? cols * 2 : fallback;
  const prev = useRef(limit);
  useEffect(() => {
    if (prev.current !== limit) { prev.current = limit; if (setPage) setPage(1); }
  }, [limit, setPage]);

  return { gridRef: setEl, limit };
}

// Page numbers to show: first, last and 2 either side of the current page,
// "…" for the gaps - e.g. 1 … 4 5 [6] 7 8 … 20
export function pageList(current, totalPages) {
  const set = new Set([1, totalPages]);
  for (let p = current - 2; p <= current + 2; p++) if (p >= 1 && p <= totalPages) set.add(p);
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => { if (i > 0 && p - sorted[i - 1] > 1) out.push("…"); out.push(p); });
  return out;
}

// « Prev  1 2 [3] 4  Next »   Page 3 of 4 · 20 records
export default function Pager({ page, pages, total, onPage, noun = "records" }) {
  if (!pages || pages <= 1) return null;
  const go = (p) => {
    onPage(p);
    // bring the first cards back into view after changing page
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="pager" role="navigation" aria-label="Pages">
      <button className="btn small secondary" disabled={page <= 1} onClick={() => go(page - 1)}>« Prev</button>
      {pageList(page, pages).map((p, i) => (p === "…"
        ? <span key={`gap${i}`} className="pager-gap">…</span>
        : <button key={p} className={`btn small ${p === page ? "" : "secondary"} pager-num`}
                  aria-current={p === page ? "page" : undefined} onClick={() => go(p)}>{p}</button>
      ))}
      <button className="btn small secondary" disabled={page >= pages} onClick={() => go(page + 1)}>Next »</button>
      <span className="pager-info">Page {page} of {pages}{total !== undefined ? ` · ${total} ${noun}` : ""}</span>
    </div>
  );
}

// For lists that are already fully loaded in the page (no server paging):
// returns { gridRef, page, setPage, pages, items } where items = only this page's cards.
export function useClientTwoRowPaging(list, active) {
  const [page, setPage] = useState(1);
  const { gridRef, limit } = useTwoRowLimit(active, setPage, Number.MAX_SAFE_INTEGER);
  const all = list || [];
  const pages = active ? Math.max(1, Math.ceil(all.length / limit)) : 1;
  const safePage = Math.min(page, pages);
  const items = active ? all.slice((safePage - 1) * limit, safePage * limit) : all;
  // when the list gets shorter (filter / delete) stay on a valid page
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  return { gridRef, page: safePage, setPage, pages, items };
}
