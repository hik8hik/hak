"use client";
import { useEffect } from "react";
import { useSettings, type Theme, type ViewMode } from "@/context/SettingsContext";
import { downloadObsidian } from "@/lib/obsidian";
import { FALLBACK } from "@/lib/fallback";

export default function SettingsDrawer(
  { open, onClose }: { open: boolean; onClose: () => void }
) {
  const { s, set, reset } = useSettings();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <aside className="drawer" data-open={open ? "true" : "false"} aria-hidden={!open}>
      <div className="row">
        <strong>Settings</strong>
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Close</button>
      </div>
      <h4>Theme</h4>
      <div className="seg">
        {(["light","dark","black","auto"] as Theme[]).map((t) => (
          <button key={t} data-active={s.theme===t} onClick={() => set("theme", t)}>{t}</button>
        ))}
      </div>
      <h4>View</h4>
      <div className="seg">
        {(["scroll","page","sheet"] as ViewMode[]).map((v) => (
          <button key={v} data-active={s.viewMode===v} onClick={() => set("viewMode", v)}>{v}</button>
        ))}
      </div>
      <h4>Typography</h4>
      <div className="row"><label>Font size</label><input type="range" min={11} max={28} value={s.fontSize} onChange={(e)=>set("fontSize", +e.target.value)} /><span className="small muted">{s.fontSize}px</span></div>
      <div className="row"><label>Line height</label><input type="range" min={1.2} max={2.4} step={0.05} value={s.lineHeight} onChange={(e)=>set("lineHeight", +e.target.value)} /></div>
      <h4>Colours</h4>
      <div className="row"><label>Category colours</label><input type="checkbox" checked={s.showCategoryColors} onChange={(e)=>set("showCategoryColors", e.target.checked)} /></div>
      <div className="row"><label>Show labels</label><input type="checkbox" checked={s.showLabels} onChange={(e)=>set("showLabels", e.target.checked)} /></div>
      <h4>Workspace</h4>
      <div className="row"><label>Sound</label><input type="checkbox" checked={s.soundOn} onChange={(e)=>set("soundOn", e.target.checked)} /></div>
      <div className="row"><label>Brand watermark</label><input type="checkbox" checked={s.watermark} onChange={(e)=>set("watermark", e.target.checked)} /></div>
      <div className="row"><label>Watermark text</label><input type="text" value={s.watermarkText} onChange={(e)=>set("watermarkText", e.target.value)} style={{ flex: 1 }} /></div>
      <div className="row"><label>Accent</label><input type="color" value={s.accentColor} onChange={(e)=>set("accentColor", e.target.value)} /></div>
      <h4>Exports</h4>
      <div className="row">
        <button className="btn" onClick={() => downloadObsidian(FALLBACK)}>Obsidian vault (.zip)</button>
      </div>
      <div className="row"><button className="btn" onClick={reset}>Reset to defaults</button></div>
      <p className="small muted" style={{marginTop: 12}}>
        Settings persist to localStorage. View mode is mirrored to a cookie.
      </p>
    </aside>
  );
}