"use client";
import { useEffect, useRef, useState } from "react";
import { useScriptSettings, type RenderMode } from "@/context/ScriptSettingsContext";
import { PRESETS } from "@/lib/types";
import { rasteriseCloned, download, inheritThemeVars } from "@/lib/export";
import { animationSupported, recordAnimation, recordCanvasAnimation, downloadBlob } from "@/lib/animate";
import { getAudioContext, getPreviewBank, makeRecorderBank, makeRecorderPluck, pluckFreqForX, pluckFreqForHue } from "@/lib/sound";
import { carouselSlides } from "@/lib/carousel";
import { ConvergeSim, parseConvergeConfig, prioritizeHits, convergeConfigJson, DEFAULT_CONVERGE } from "@/lib/converge";
import JSZip from "jszip";
import RenderTerminal from "./RenderTerminal";
import RenderCode from "./RenderCode";
import RenderDiff from "./RenderDiff";
import RenderChain from "./RenderChain";
import RenderHexdump from "./RenderHexdump";
import RenderYara from "./RenderYara";
import RenderRunbook from "./RenderRunbook";
import RenderPcap from "./RenderPcap";
import RenderConverge, { type ConvergeHandle } from "./RenderConverge";

const RENDER_MODES: RenderMode[] = ["terminal","code","diff","chain","hexdump","yara","runbook","pcap","converge"];
const STUDIO_THEMES = [
  { id: "terminal-green", name: "Terminal Green", fg: "#00ff41", bg: "#000000" },
  { id: "amber-crt",      name: "Amber CRT",      fg: "#ffcc00", bg: "#1a0f00" },
  { id: "blood-red",      name: "Blood Red",      fg: "#ff3344", bg: "#0a0000" },
  { id: "matrix-rain",    name: "Matrix Rain",    fg: "#00ff41", bg: "#050f05" },
  { id: "corporate-blue", name: "Corporate Blue", fg: "#7BA5FF", bg: "#0d1117" },
  { id: "nord",           name: "Nord",           fg: "#d8dee9", bg: "#2e3440" },
  { id: "dracula",        name: "Dracula",        fg: "#f8f8f2", bg: "#282a36" },
];

const MAX_FRAMES = 2400;
const AUDIO_LEAD_MS = 450;
const CONVERGE_EXPORT_SECONDS = 10;

function buildTerminalFrame(
  text: string,
  visibleChars: number,
  W: number,
  H: number,
  cfg: {
    bg: string; fg: string; transparent: boolean;
    padding: number; borderRadius: number; fontFamily: string;
    fontSize: number; fontWeight: number; letterSpacing: number;
    lineHeight: number; textAlign: string;
  },
): HTMLElement {
  const clipped = text.slice(0, Math.max(0, visibleChars));
  const lines = clipped.split("\n");
  const outer = document.createElement("div");
  outer.style.cssText = "width:" + W + "px;height:" + H + "px;box-sizing:border-box;overflow:hidden;" + (cfg.transparent ? "background:transparent;" : "background:" + cfg.bg + ";");
  const inner = document.createElement("div");
  inner.className = "render terminal export-frame";
  inner.style.width = "100%";
  inner.style.height = "100%";
  inner.style.boxSizing = "border-box";
  inner.style.overflow = "hidden";
  inner.style.background = cfg.transparent ? "transparent" : cfg.bg;
  inner.style.color = cfg.fg;
  inner.style.padding = cfg.padding + "px";
  inner.style.borderRadius = cfg.borderRadius + "px";
  inner.style.fontFamily = cfg.fontFamily;
  inner.style.fontSize = cfg.fontSize + "px";
  inner.style.fontWeight = String(cfg.fontWeight);
  inner.style.letterSpacing = cfg.letterSpacing + "em";
  inner.style.lineHeight = String(cfg.lineHeight);
  inner.style.textAlign = cfg.textAlign;
  inner.style.whiteSpace = "pre-wrap";
  inner.style.wordBreak = "break-word";
  const last = lines.length - 1;
  lines.forEach((line, i) => {
    const row = document.createElement("div");
    row.className = "ln";
    row.textContent = line;
    if (i === last) {
      const cursor = document.createElement("span");
      cursor.className = "cursor";
      row.appendChild(cursor);
    }
    if (row.childNodes.length === 0) row.appendChild(document.createTextNode("\u00a0"));
    inner.appendChild(row);
  });
  outer.appendChild(inner);
  return outer;
}

export default function StudioShell() {
  const { s, set, reset } = useScriptSettings();
  const [text, setText] = useState("nmap -sV -Pn 10.0.0.0/24\ncurl -s http://target/.env\nprintf '%s' $TOKEN | base64 -d");
  const [patched, setPatched] = useState("nmap -sV -Pn 10.0.0.0/24\ncurl -s https://target/.env --proto =https --tlsv1.2\nprintf '%s' \"$TOKEN\" | base64 -d")
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typedCount, setTypedCount] = useState(0);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [soundKitLabel, setSoundKitLabel] = useState<string>("synthesized");
  const previewRef = useRef<HTMLDivElement>(null);
  const convergeRef = useRef<ConvergeHandle>(null);
  const lines = text.split("\n");

  // Handoff from /weekly or the queue: read once, apply, clear.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("hak.handoff");
      if (!raw) return;
      const h = JSON.parse(raw);
      if (h && typeof h.text === "string") setText(h.text);
      if (h && typeof h.mode === "string") set("renderMode", h.mode);
      localStorage.removeItem("hak.handoff");
      setNotice("Loaded from /weekly \u2014 mode " + (h.mode || "terminal"));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the keystroke bank once on mount so preview is instant.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const bank = await getPreviewBank();
        if (!cancelled) setSoundKitLabel(bank.isCustom ? "custom samples" : "synthesized");
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // When the user switches INTO converge mode with shell text in the box,
  // replace it with the default JSON config so they can see the shape and
  // edit. We only do this when the current text is clearly not JSON.
  useEffect(() => {
    if (s.renderMode !== "converge") return;
    const t = text.trim();
    if (t.startsWith("{") || /^\d+$/.test(t)) return;
    setText(convergeConfigJson(DEFAULT_CONVERGE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.renderMode]);

  // Line-by-line preview typing (terminal mode only).
  useEffect(() => {
    if (!typing || s.renderMode === "converge") { setTypedCount(lines.length); return; }
    setTypedCount(0);
    let i = 0;
    const t = setInterval(() => {
      i += 1; setTypedCount(i);
      if (s.soundOn) void getPreviewBank().then((b) => b.play("x"));
      if (i >= lines.length) {
        clearInterval(t);
        if (s.soundOn) void getPreviewBank().then((b) => b.play("\n"));
      }
    }, 420);
    return () => clearInterval(t);
  }, [typing, text, s.soundOn, s.renderMode]);

  const theme = STUDIO_THEMES.find((t) => t.id === s.theme) || STUDIO_THEMES[0];
  const exportBg = s.transparent ? null : theme.bg;

  // ---- still exports (PNG) ----------------------------------------
  async function exportOne(presetId: string) {
    const p = PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    if (s.renderMode === "converge") {
      const canvas = convergeRef.current?.getCanvas();
      if (!canvas) return;
      // Snapshot the current preview canvas as-is. Reduced resolution
      // (preview size) but instantaneous. Full-res output is the WebM.
      const url = canvas.toDataURL("image/png");
      download(url, "hak-converge-snapshot.png");
      return;
    }
    if (!previewRef.current) return;
    const url = await rasteriseCloned(previewRef.current, {
      width: p.w, height: p.h, pixelRatio: p.pr, background: exportBg,
    });
    download(url, "hak-payload-" + p.id + ".png");
  }
  async function exportPerLine() {
    const zip = new JSZip();
    const p = PRESETS.find((x) => x.id === s.exportPreset) || PRESETS[0];
    for (let i = 0; i < lines.length; i++) {
      const url = await rasteriseCloned(previewRef.current!, {
        width: p.w, height: p.h, pixelRatio: p.pr, background: exportBg,
      });
      zip.file("line-" + String(i + 1).padStart(3, "0") + ".png", url.split(",")[1], { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "hak-payload-studio.zip"; a.click();
  }
  async function exportCarousel() {
    const zip = new JSZip();
    const slides = carouselSlides(text);
    for (let i = 0; i < slides.length; i++) {
      const url = await rasteriseCloned(previewRef.current!, {
        width: 1080, height: 1350, pixelRatio: 2, background: exportBg,
      });
      zip.file("slide-" + String(i + 1).padStart(2, "0") + ".png", url.split(",")[1], { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "hak-carousel.zip"; a.click();
  }

  // ---- animated export (DOM-rasterised modes) ---------------------
  function frameBuilder(presetW: number, presetH: number) {
    if (s.renderMode === "terminal") {
      const total = Math.max(1, text.length);
      const cfg = {
        bg: theme.bg, fg: theme.fg, transparent: s.transparent,
        padding: s.padding, borderRadius: s.borderRadius,
        fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight,
        letterSpacing: s.letterSpacing, lineHeight: s.lineHeight, textAlign: s.textAlign,
      };
      return (i: number, N: number) => {
        const visible = Math.min(total, Math.floor((i * s.typingCps) / s.animationFps));
        return buildTerminalFrame(text, visible, presetW, presetH, cfg);
      };
    }
    return (i: number, N: number) => {
      const src = previewRef.current;
      if (!src) throw new Error("Preview not mounted");
      const progress = N === 0 ? 1 : i / N;
      const outer = document.createElement("div");
      outer.style.cssText = "width:" + presetW + "px;height:" + presetH + "px;position:relative;overflow:hidden;background:" + (s.transparent ? "transparent" : theme.bg) + ";";
      const clone = src.cloneNode(true) as HTMLElement;
      clone.style.width = presetW + "px";
      clone.style.height = presetH + "px";
      clone.style.boxSizing = "border-box";
      clone.style.overflow = "hidden";
      if (s.transparent) clone.style.background = "transparent";
      inheritThemeVars(outer);
      inheritThemeVars(clone);
      const reveal = document.createElement("div");
      reveal.style.cssText = "width:100%;height:" + Math.max(2, Math.round(progress * 100)) + "%;overflow:hidden;";
      reveal.appendChild(clone);
      outer.appendChild(reveal);
      return outer;
    };
  }

  // ---- converge export (canvas-direct, 60fps native) --------------
  async function exportConverge(presetId: string) {
    if (recording) return;
    if (!animationSupported()) {
      setNotice("Animated export needs Chrome, Edge, Brave or Firefox.");
      return;
    }
    setNotice(null); setRecording(true); setProgress(0);

    let audioStream: MediaStream | null = null;
    let pluckKit: ReturnType<typeof makeRecorderPluck> | null = null;
    if (s.soundInExport) {
      try {
        const ctx = getAudioContext();
        if (ctx.state === "suspended") await ctx.resume();
        pluckKit = makeRecorderPluck();
        audioStream = pluckKit.stream;
      } catch (e) {
        console.warn("[hak] pluck kit failed, exporting silent", e);
        audioStream = null;
      }
    }

    const p = PRESETS.find((x) => x.id === presetId) || PRESETS[0];
    const cfg = parseConvergeConfig(text);
    const W = p.w * s.animationScale;
    const H = p.h * s.animationScale;

    // Off-screen canvas at export size, own sim instance (same seed ->
    // same trajectories as the preview when config matches).
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = p.w + "px";
    canvas.style.height = p.h + "px";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "-200vw";
    canvas.style.pointerEvents = "none";
    document.body.appendChild(canvas);

    const sim = new ConvergeSim(canvas, cfg);
    const frames = Math.round(CONVERGE_EXPORT_SECONDS * s.animationFps)

    try {
      const blob = await recordCanvasAnimation(canvas, () => {
        const hits = sim.step(1 / s.animationFps)
        if (pluckKit && cfg.wallHitSound && hits.length) {
          for (const h of prioritizeHits(hits, 3)) {
            const freq =
              cfg.pitchMap === "hue" ? pluckFreqForHue(h.hue) :
              cfg.pitchMap === "y"   ? pluckFreqForX(-h.y) :
                                       pluckFreqForX(h.x)
            pluckKit.kit.play(freq)
          }
        }
        sim.render()
      }, {
        fps: s.animationFps,
        frameCount: frames,
        audioStream,
        onProgress: (_phase, prog) => setProgress(prog),
      })
      downloadBlob(blob, "hak-converge-" + presetId + "-" + s.animationFps + "fps.webm")
    } catch (e) {
      console.error("[hak] converge export failed", e)
      setNotice("Converge export failed: " + String(e))
    } finally {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
      setRecording(false); setProgress(0);
    }
  }

  // ---- animated export dispatcher ---------------------------------
  async function exportAnimated(presetId: string) {
    if (s.renderMode === "converge") {
      return exportConverge(presetId)
    }
    if (recording) return;
    if (!animationSupported()) {
      setNotice("Animated export needs Chrome, Edge, Brave or Firefox.");
      return;
    }
    setNotice(null); setRecording(true); setProgress(0);

    let audioStream: MediaStream | null = null;
    let audioBank: Awaited<ReturnType<typeof makeRecorderBank>> | null = null;
    if (s.soundInExport) {
      try {
        const ctx = getAudioContext();
        if (ctx.state === "suspended") await ctx.resume();
        audioBank = await makeRecorderBank();
        audioStream = audioBank.stream;
      } catch (e) {
        console.warn("[hak] audio bank failed, exporting silent", e);
        audioStream = null;
      }
    }

    const p = PRESETS.find((x) => x.id === presetId) || PRESETS[0];
    let N: number;
    let minHoldMs = 0;
    if (s.renderMode === "terminal") {
      N = Math.max(2, Math.ceil((text.length * s.animationFps) / s.typingCps));
      if (N > MAX_FRAMES) N = MAX_FRAMES;
    } else {
      N = Math.max(2, s.revealSteps);
      minHoldMs = s.revealHoldMs;
    }

    let scheduledChars = 0;
    if (audioBank && s.renderMode === "terminal") {
      const ctx = getAudioContext();
      const t0 = ctx.currentTime + AUDIO_LEAD_MS / 1000;
      const cps = s.typingCps;
      const fps = s.animationFps;
      for (let n = 0; n < text.length; n++) {
        const frameIdx = Math.ceil((n * fps) / cps);
        if (frameIdx > N) break;
        const when = t0 + frameIdx / fps;
        audioBank.bank.schedule(text[n], when);
        scheduledChars++;
      }
      const endWhen = t0 + (Math.ceil((text.length * fps) / cps) / fps) + 0.12;
      audioBank.bank.schedule("\n", endWhen);
    } else if (audioBank) {
      const ctx = getAudioContext();
      const t0 = ctx.currentTime + AUDIO_LEAD_MS / 1000;
      audioBank.bank.schedule("x", t0);
    }

    try {
      const blob = await recordAnimation(frameBuilder(p.w, p.h), {
        width: p.w, height: p.h,
        pixelRatio: s.animationScale,
        fps: s.animationFps,
        frameCount: N,
        minHoldMs,
        bg: exportBg,
        audioStream,
        startDelayMs: audioStream ? AUDIO_LEAD_MS : 0,
        onProgress: (_phase, p2) => setProgress(p2),
      });
      downloadBlob(blob, "hak-" + presetId + "-" + s.animationFps + "fps.webm");
      if (audioStream) setNotice("Encoded with " + scheduledChars + " keystroke cues (" + soundKitLabel + ").");
    } catch (e) {
      console.error("[hak] animated export failed", e);
      setNotice("Animated export failed: " + String(e));
    } finally {
      setRecording(false); setProgress(0);
    }
  }

  const previewStyle: React.CSSProperties = {
    background: s.transparent ? "transparent" : theme.bg,
    color: theme.fg,
    padding: s.padding, borderRadius: s.borderRadius,
    fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight,
    letterSpacing: s.letterSpacing, lineHeight: s.lineHeight, textAlign: s.textAlign,
    overflow: "hidden",
  } as React.CSSProperties;
  const previewVisibleLines = recording ? lines : lines.slice(0, Math.max(1, typedCount));
  const isConverge = s.renderMode === "converge";

  return (
    <div className="studio">
      <div className="pane raised">
        <div className="row">
          <strong>Input</strong>
          <div className="spacer" />
          <button className="btn" onClick={() => setDrawerOpen(true)}>Studio settings</button>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} disabled={recording} />
        {isConverge && (
          <p className="small muted" style={{ margin: 0 }}>
            Paste a JSON config or a ball count. Defaults: {DEFAULT_CONVERGE.balls} balls, speed {DEFAULT_CONVERGE.speed}, sound on.
          </p>
        )}
        {s.renderMode === "diff" && (
          <>
            <div className="small muted">Patched (right column)</div>
            <textarea value={patched} onChange={(e) => setPatched(e.target.value)} spellCheck={false} style={{ minHeight: 90 }} disabled={recording} />
          </>
        )}
        <div className="tabs">
          {RENDER_MODES.map((m) => (
            <button key={m} className="btn" data-active={s.renderMode === m} onClick={() => set("renderMode", m)} disabled={recording}>{m}</button>
          ))}
        </div>
        <div className="tabs">
          {PRESETS.map((p) => (
            <button key={p.id} className="btn" data-active={s.exportPreset === p.id} onClick={() => set("exportPreset", p.id)} disabled={recording}>{p.label}</button>
          ))}
        </div>
        <div className="tabs">
          {!isConverge && (
            <button className="btn" data-active={typing} onClick={() => setTyping((v) => !v)} disabled={recording}>Typing preview</button>
          )}
          {isConverge && (
            <button className="btn" onClick={() => convergeRef.current?.reset()} disabled={recording}>Restart sim</button>
          )}
          <button className="btn" onClick={() => exportOne(s.exportPreset)} disabled={recording}>Export current</button>
          {!isConverge && <button className="btn" onClick={exportPerLine} disabled={recording}>Per-line ZIP</button>}
          {!isConverge && <button className="btn" onClick={exportCarousel} disabled={recording}>Carousel</button>}
          <button className="btn" onClick={() => exportAnimated(s.exportPreset)} disabled={recording}>
            {recording ? "Recording " + Math.round(progress * 100) + "%" : (isConverge ? "Simulate " + s.animationFps + "fps WebM" : "Animated (" + s.animationFps + "fps WebM)")}
          </button>
        </div>
        {recording && (
          <div className="pane pressed" style={{ padding: "6px 10px", marginTop: 6 }}>
            <div className="small muted">Encoding. Keep this tab in focus \u2014 background tabs throttle the canvas.</div>
          </div>
        )}
        {notice && <p className="small muted" style={{ marginTop: 6 }}>{notice}</p>}
      </div>
      <div className="pane raised">
        <div className="row">
          <strong>Preview</strong>
          <div className="spacer" />
          <span className="small muted">{s.renderMode}{s.transparent && !isConverge ? " \u00b7 transparent" : ""}{s.soundInExport ? " \u00b7 sound" : ""}</span>
        </div>
        <div className="preview" style={!isConverge && s.transparent ? { backgroundImage: "repeating-conic-gradient(#c0c4cc 0% 25%, #e8e8e8 0% 50%)", backgroundSize: "20px 20px" } : undefined}>
          {isConverge ? (
            <RenderConverge ref={convergeRef} text={text} running={!recording} withSound={s.soundOn} />
          ) : (
            <div ref={previewRef} className={"render " + s.renderMode} style={previewStyle}>
              {s.renderMode === "terminal" && <RenderTerminal lines={previewVisibleLines} />}
              {s.renderMode === "code" && <RenderCode text={text} />}
              {s.renderMode === "diff" && <RenderDiff left={text} right={patched} />}
              {s.renderMode === "chain" && <RenderChain lines={lines} />}
              {s.renderMode === "hexdump" && <RenderHexdump text={text} />}
              {s.renderMode === "yara" && <RenderYara text={text} />}
              {s.renderMode === "runbook" && <RenderRunbook lines={lines} />}
              {s.renderMode === "pcap" && <RenderPcap text={text} />}
            </div>
          )}
        </div>
      </div>

      <aside className="drawer" data-open={drawerOpen ? "true" : "false"}>
        <div className="row">
          <strong>Studio</strong>
          <div className="spacer" />
          <button className="btn" onClick={() => setDrawerOpen(false)}>Close</button>
        </div>
        <h4>Theme</h4>
        <div className="seg" style={{ flexWrap: "wrap" }}>
          {STUDIO_THEMES.map((t) => (
            <button key={t.id} data-active={s.theme === t.id} onClick={() => set("theme", t.id)}>{t.name}</button>
          ))}
        </div>
        <h4>Typography</h4>
        <div className="row"><label>Font</label>
          <select value={s.fontFamily} onChange={(e) => set("fontFamily", e.target.value)}>
            <option>JetBrains Mono</option><option>Fira Code</option>
            <option>IBM Plex Mono</option><option>Cascadia Code</option>
            <option>Source Code Pro</option><option>Roboto Mono</option>
          </select>
        </div>
        <div className="row"><label>Size</label><input type="range" min={10} max={36} value={s.fontSize} onChange={(e) => set("fontSize", +e.target.value)} /><span className="small muted">{s.fontSize}px</span></div>
        <div className="row"><label>Weight</label><input type="range" min={300} max={800} step={100} value={s.fontWeight} onChange={(e) => set("fontWeight", +e.target.value)} /></div>
        <div className="row"><label>Tracking</label><input type="range" min={-1} max={4} step={0.1} value={s.letterSpacing} onChange={(e) => set("letterSpacing", +e.target.value)} /></div>
        <div className="row"><label>Line height</label><input type="range" min={1} max={2.4} step={0.05} value={s.lineHeight} onChange={(e) => set("lineHeight", +e.target.value)} /></div>
        <h4>Animation</h4>
        <div className="row"><label>FPS</label>
          <div className="seg">
            {[30, 60].map((f) => (
              <button key={f} data-active={s.animationFps === f} onClick={() => set("animationFps", f as 30 | 60)}>{f}</button>
            ))}
          </div>
        </div>
        <div className="row"><label>Typing (chars/s)</label><input type="range" min={5} max={80} value={s.typingCps} onChange={(e) => set("typingCps", +e.target.value)} /><span className="small muted">{s.typingCps}</span></div>
        <div className="row"><label>Reveal steps</label><input type="range" min={4} max={48} value={s.revealSteps} onChange={(e) => set("revealSteps", +e.target.value)} /><span className="small muted">{s.revealSteps}</span></div>
        <div className="row"><label>Reveal hold (ms)</label><input type="range" min={60} max={600} step={20} value={s.revealHoldMs} onChange={(e) => set("revealHoldMs", +e.target.value)} /><span className="small muted">{s.revealHoldMs}</span></div>
        <div className="row"><label>Scale</label>
          <div className="seg">
            {[1, 2].map((n) => (
              <button key={n} data-active={s.animationScale === n} onClick={() => set("animationScale", n as 1 | 2)}>{n}\u00d7</button>
            ))}
          </div>
          <span className="small muted">{s.animationScale === 2 ? "slow" : "fast"}</span>
        </div>
        <h4>Layout</h4>
        <div className="row"><label>Padding</label><input type="range" min={0} max={80} value={s.padding} onChange={(e) => set("padding", +e.target.value)} /></div>
        <div className="row"><label>Radius</label><input type="range" min={0} max={40} value={s.borderRadius} onChange={(e) => set("borderRadius", +e.target.value)} /></div>
        <div className="row"><label>Transparent</label><input type="checkbox" checked={s.transparent} onChange={(e) => set("transparent", e.target.checked)} /></div>
        <h4>Sound</h4>
        <div className="row"><label>Preview ticks</label><input type="checkbox" checked={s.soundOn} onChange={(e) => set("soundOn", e.target.checked)} /></div>
        <div className="row"><label>Sound in export</label><input type="checkbox" checked={s.soundInExport} onChange={(e) => set("soundInExport", e.target.checked)} /></div>
        <p className="small muted" style={{ margin: "0 0 8px" }}>
          Sound kit: {soundKitLabel}. Drop WAVs in
          <code className="mono"> public/sounds/ </code> to use real samples.
        </p>
        <div className="row"><button className="btn" onClick={reset}>Reset studio</button></div>
      </aside>
    </div>
  );
}