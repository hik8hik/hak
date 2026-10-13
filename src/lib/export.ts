import { toPng } from "html-to-image";

export interface RasterOpts {
  width: number;
  height: number;
  pixelRatio: number;
  /**
   * - undefined  → let the node decide (its own inline background applies)
   * - null       → canvas is NOT pre-filled; result is transparent
   * - "#rrggbb"  → flat background
   */
  background?: string | null;
}

const THEME_VARS = [
  "--bg", "--surface", "--surface-2", "--surface-3",
  "--text", "--text-dim", "--accent", "--accent-soft",
  "--shadow-light", "--shadow-dark", "--border",
  "--cs-critical", "--cs-high", "--cs-medium", "--cs-low", "--cs-none",
];

/**
 * Copy the current theme CSS variables onto an element so descendants
 * resolve var(--surface) etc. correctly. The clone html-to-image builds
 * lives inside an SVG foreignObject with no document ancestry, so the
 * vars defined on :root do not reach it — we inline them here.
 */
export function inheritThemeVars(el: HTMLElement) {
  if (typeof window === "undefined") return;
  const cs = getComputedStyle(document.documentElement);
  for (const n of THEME_VARS) {
    const v = cs.getPropertyValue(n).trim();
    if (v) el.style.setProperty(n, v);
  }
}

export function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Current theme surface colour. */
export function surfaceColor(): string {
  return cssVar("--surface", "#e8ecf3");
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/**
 * Rasterise `node` to a PNG data URL.
 *  - Explicit width/height are used (never offsetWidth/offsetHeight).
 *  - background === null  → canvas is left un-filled → transparent PNG.
 *  - background === undefined → node\u2019s own inline/computed background shows.
 */
export async function rasteriseNode(
  node: HTMLElement,
  opts: RasterOpts,
): Promise<string> {
  await nextFrame();
  try { await (document as any).fonts?.ready; } catch {}
  const backgroundColor =
    opts.background === null ? undefined : (opts.background ?? undefined);
  const url = await toPng(node, {
    width: opts.width,
    height: opts.height,
    pixelRatio: opts.pixelRatio,
    backgroundColor,
    cacheBust: true,
    skipFonts: false,
  });
  if (url.length < 5000) {
    console.warn(
      "[hak] suspiciously short export — likely blank.",
      "length=", url.length,
      "size=", opts.width + "x" + opts.height,
      "@", opts.pixelRatio,
    );
  }
  return url;
}

/**
 * Rasterise a standalone HTML string off-screen. The correct path for
 * card and queue exports: interactive DOM is never touched, so hover
 * buttons and dialogs cannot leak into the output.
 */
export async function rasteriseHtml(
  html: string,
  opts: RasterOpts,
): Promise<string> {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "position:fixed;top:0;left:-200vw;pointer-events:none;overflow:hidden;z-index:-1;";
  const host = document.createElement("div");
  host.style.cssText =
    "width:" + opts.width + "px;" +
    "height:" + opts.height + "px;" +
    "box-sizing:border-box;" +
    "overflow:hidden;" +
    (opts.background === null
      ? "background:transparent;"
      : opts.background
        ? "background:" + opts.background + ";"
        : "");
  inheritThemeVars(host);
  host.innerHTML = html;
  wrap.appendChild(host);
  document.body.appendChild(wrap);
  try {
    return await rasteriseNode(host, opts);
  } finally {
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }
}

/**
 * Deep-clone a live node into an off-screen wrapper, apply the theme
 * variables, and rasterise the clone. Used by the studio, where the
 * preview is a complex React subtree we do not want to rebuild as
 * HTML but do want isolated from the live DOM.
 */
export async function rasteriseCloned(
  source: HTMLElement,
  opts: RasterOpts,
): Promise<string> {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "position:fixed;top:0;left:-200vw;pointer-events:none;overflow:hidden;z-index:-1;";
  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.width = opts.width + "px";
  clone.style.height = opts.height + "px";
  clone.style.boxSizing = "border-box";
  clone.style.overflow = "hidden";
  if (opts.background === null) clone.style.background = "transparent";
  else if (opts.background) clone.style.background = opts.background;
  inheritThemeVars(clone);
  wrap.appendChild(clone);
  document.body.appendChild(wrap);
  try {
    return await rasteriseNode(clone, opts);
  } finally {
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }
}

/** Legacy alias — kept so older callers keep working. */
export async function rasterise(el: HTMLElement, opts: RasterOpts): Promise<string> {
  inheritThemeVars(el);
  return rasteriseNode(el, opts);
}

export function download(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}