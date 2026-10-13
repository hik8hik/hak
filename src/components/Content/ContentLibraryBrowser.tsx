"use client";
import { useMemo, useState } from "react";
import type { ContentCard, ContentCategory } from "@/content/types";
import { CATEGORIES, SERIES, CARDS, seriesForCategory } from "@/content/library";

interface Props {
  activeId: string | null;
  onPick: (id: string) => void;
}

export default function ContentLibraryBrowser({ activeId, onPick }: Props) {
  const [category, setCategory] = useState<ContentCategory>("cyber")
  const [series, setSeries] = useState<string>("*")
  const [q, setQ] = useState("")

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return CARDS.filter((c) => c.category === category)
      .filter((c) => series === "*" || c.series === series)
      .filter((c) => {
        if (!needle) return true
        return (
          c.hook.toLowerCase().includes(needle) ||
          c.body.some((l) => l.toLowerCase().includes(needle)) ||
          (c.tags || []).some((t) => t.toLowerCase().includes(needle))
        )
      })
  }, [category, series, q])

  const seriesList = seriesForCategory(category)
  const catInfo = CATEGORIES.find((c) => c.id === category)

  return (
    <div className="content-lib">
      <div className="content-lib-head">
        <div className="seg" style={{ flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              data-active={category === c.id}
              onClick={() => { setCategory(c.id); setSeries("*"); onPick("") }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input
          className="inset-sm content-search"
          placeholder="Search cards…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {catInfo && (
        <p className="small muted" style={{ margin: "4px 0 12px" }}>{catInfo.blurb}</p>
      )}

      <div className="chips">
        <button
          className="chip"
          data-active={series === "*"}
          onClick={() => setSeries("*")}
        >
          All ({CARDS.filter((c) => c.category === category).length})
        </button>
        {seriesList.map((sr) => {
          const n = CARDS.filter((c) => c.series === sr.id).length
          return (
            <button
              key={sr.id}
              className="chip"
              data-active={series === sr.id}
              title={sr.blurb}
              onClick={() => setSeries(sr.id)}
            >
              {sr.label} ({n})
            </button>
          )
        })}
      </div>

      <div className="content-grid">
        {list.length === 0 && (
          <p className="muted small" style={{ padding: 12 }}>
            No cards match. Try a different series or clear the search.
          </p>
        )}
        {list.map((c) => (
          <button
            key={c.id}
            className="content-thumb"
            data-active={activeId === c.id}
            onClick={() => onPick(c.id)}
          >
            <div className="content-thumb-hook">{c.hook}</div>
            <div className="content-thumb-meta">
              <span className="pill">{c.layout}</span>
              <span className="small muted">{c.series}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}