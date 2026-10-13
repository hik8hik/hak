"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ThreatItem } from "@/lib/types";
import { PRESETS } from "@/lib/types";
import { severityVar } from "@/lib/colors";
import { buildQueueHtml } from "@/lib/queueRender";
import { rasteriseHtml, download, surfaceColor } from "@/lib/export";
import {
  TEMPLATES,
  buildWeeklyPayload,
  templateMeta,
  type WeeklyTemplate,
} from "@/lib/weekly";

const DAY_OPTIONS = [3, 7, 14, 30, 90];
const HANDOFF_KEY = "hak.handoff";

export default function WeeklyKev() {
  const router = useRouter();
  const [days, setDays] = useState(7);
  const [items, setItems] = useState<ThreatItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [template, setTemplate] = useState<WeeklyTemplate>("terminal");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setItems(null);
    setErr(null);
    fetch("/api/weekly-kev?days=" + days)
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return;
        setItems(Array.isArray(d?.items) ? d.items : []);
      })
      .catch((e) => { if (!cancel) setErr(String(e)); });
    return () => { cancel = true; };
  }, [days]);

  const payload = useMemo(
    () => (items ? buildWeeklyPayload(template, items, days) : ""),
    [template, items, days],
  );

  const meta = templateMeta(template);

  function copy() {
    if (!payload) return;
    void navigator.clipboard.writeText(payload);
    setNotice("Copied " + payload.length + " chars.");
  }

  function downloadFile() {
    if (!payload) return;
    const blob = new Blob([payload], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hak-weekly-kev-" + days + "d." + meta.ext;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  function sendToStudio() {
    if (!payload) return;
    try {
      localStorage.setItem(
        HANDOFF_KEY,
        JSON.stringify({ text: payload, mode: meta.mode }),
      );
      router.push("/studio");
    } catch (e) {
      setNotice("Could not hand off: " + String(e));
    }
  }

  async function exportTopAsPng() {
    if (busy || !items || items.length === 0) return;
    setBusy(true);
    setNotice(null);
    try {
      const p = PRESETS.find((x) => x.id === "reel4k") || PRESETS[0];
      const html = buildQueueHtml(items[0], p);
      const url = await rasteriseHtml(html, {
        width: p.w,
        height: p.h,
        pixelRatio: p.pr,
        background: surfaceColor(),
      });
      download(url, "hak-weekly-top-" + items[0].id + ".png");
      setNotice("Exported " + items[0].id + " at Reel 4K.");
    } catch (e) {
      setNotice("Export failed: " + String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>This week in KEV</h2>
        <div className="spacer" />
        <span className="small muted">Window</span>
        <div className="seg">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              data-active={days === d}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <p className="muted small">
        Pulls CISA KEV entries with a dateAdded inside the selected window,
        newest first. Pick a template, preview it, then copy, download, or
        hand off to the studio.
      </p>

      {err && <p className="muted">Failed to load KEV: {err}</p>}
      {!items && !err && <p className="muted">Loading KEV…</p>}

      {items && (
        <>
          <div className="row" style={{ marginBottom: 14, flexWrap: "wrap" }}>
            <span className="pill">
              <span className="dot" style={{ background: "var(--cs-critical)" }} />
              {items.length} new
            </span>
            <span className="small muted">in the last {days} days</span>
          </div>

          {items.length === 0 ? (
            <div className="card raised" style={{ padding: 22 }}>
              <h3 style={{ margin: 0 }}>Nothing new this window.</h3>
              <p className="muted small" style={{ marginTop: 6 }}>
                Try a wider window, or check /?view=sheet&topic=kev for the
                full recent list.
              </p>
            </div>
          ) : (
            <div className="feed" style={{ marginBottom: 18 }}>
              {items.slice(0, 6).map((it) => (
                <div className="card raised" key={it.id}>
                  <div className="card-head">
                    <span className="card-id mono">{it.id}</span>
                    <span className="pill" style={{ color: severityVar(it.severity) }}>
                      <span className="dot" style={{ background: severityVar(it.severity) }} />
                      {it.severity || "critical"}
                    </span>
                  </div>
                  <h3>{it.title}</h3>
                  <p>{it.summary}</p>
                </div>
              ))}
              {items.length > 6 && (
                <div className="card raised" style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                  <p className="muted small" style={{ margin: 0 }}>
                    + {items.length - 6} more in the payload
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {items && items.length > 0 && (
        <div className="card raised" style={{ marginTop: 18, padding: 18 }}>
          <div className="row" style={{ marginBottom: 10, flexWrap: "wrap" }}>
            <strong>Template</strong>
            <div className="seg">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  data-active={template === t.id}
                  onClick={() => setTemplate(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="spacer" />
            <span className="small muted">
              &rarr; studio mode: 
              <code className="mono">{meta.mode}</code>
            </span>
          </div>

          <pre
            className="mono small"
            style={{
              whiteSpace: "pre-wrap",
              maxHeight: 320,
              overflow: "auto",
              padding: 14,
              background: "var(--surface-2)",
              borderRadius: 10,
              margin: 0,
            }}
          >
            {payload}
          </pre>

          <div className="tabs" style={{ marginTop: 14 }}>
            <button className="btn" onClick={copy}>Copy</button>
            <button className="btn" onClick={downloadFile}>
              Download .{meta.ext}
            </button>
            <button className="btn" onClick={sendToStudio}>
              Send to Studio &rarr;
            </button>
            <button className="btn" onClick={exportTopAsPng} disabled={busy}>
              {busy ? "Exporting…" : "Export top as Reel 4K PNG"}
            </button>
          </div>

          {notice && (
            <p className="small muted" style={{ marginTop: 10 }}>{notice}</p>
          )}
        </div>
      )}
    </div>
  );
}