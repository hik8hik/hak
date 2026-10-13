"use client";
import { toCanvas } from "html-to-image";

export interface RecordOpts {
  width: number;
  height: number;
  pixelRatio?: number;
  fps?: number;
  frameCount: number;
  minHoldMs?: number;
  /**
   * - string → canvas is pre-filled with that colour every frame
   * - null   → canvas is NOT pre-filled; alpha is preserved
   */
  bg?: string | null;
  /** An audio track to mix into the output. Null means video-only. */
  audioStream?: MediaStream | null;
  /** Sleep this long before rendering frame 0, to align with audio. */
  startDelayMs?: number;
  onProgress?: (phase: "render" | "record", progress: number) => void;
}

export function animationSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  if (typeof w.MediaRecorder === "undefined") return false;
  if (typeof HTMLCanvasElement.prototype.captureStream !== "function") return false;
  return true;
}

function pickMime(withAudio: boolean): string {
  const w = window as any;
  if (!w.MediaRecorder || typeof w.MediaRecorder.isTypeSupported !== "function") {
    return withAudio ? "video/webm;codecs=vp9,opus" : "video/webm";
  }
  const videoOnly = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  const withA = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  const list = withAudio ? withA : videoOnly;
  for (const m of list) { try { if (w.MediaRecorder.isTypeSupported(m)) return m; } catch {} }
  return "video/webm";
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function recordAnimation(
  renderFrame: (index: number, total: number) => HTMLElement | Promise<HTMLElement>,
  opts: RecordOpts,
): Promise<Blob> {
  const W = Math.max(64, Math.round(opts.width));
  const H = Math.max(64, Math.round(opts.height));
  const PR = Math.max(1, opts.pixelRatio ?? 1);
  const FPS = opts.fps ?? 60;
  const N = Math.max(2, opts.frameCount);
  const minHold = opts.minHoldMs ?? 0;
  const fillColor: string | null = opts.bg === null ? null : (opts.bg ?? "#000000");
  const onProgress = opts.onProgress ?? (() => {});
  const startDelay = Math.max(0, opts.startDelayMs ?? 0);

  const audioTracks = opts.audioStream ? opts.audioStream.getAudioTracks() : [];
  const hasAudio = audioTracks.length > 0;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * PR);
  canvas.height = Math.round(H * PR);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const hidden = document.createElement("div");
  hidden.style.cssText = "position:fixed;top:0;left:-200vw;pointer-events:none;";
  document.body.appendChild(hidden);

  try { await (document as any).fonts?.ready; } catch {}

  const videoStream = (canvas as any).captureStream(FPS) as MediaStream;
  let stream: MediaStream = videoStream;
  if (hasAudio) {
    stream = new MediaStream([...videoStream.getVideoTracks(), ...audioTracks]);
  }
  const videoTrack = videoStream.getVideoTracks()[0] as any;

  const mime = pickMime(hasAudio);
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: FPS >= 60 ? 10_000_000 : 6_000_000,
      audioBitsPerSecond: 96_000,
    });
  } catch (e) {
    hidden.remove();
    stream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
    throw new Error("MediaRecorder could not start: " + String(e));
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise<void>((r) => { recorder.onstop = () => r(); });

  recorder.start();
  const t0 = performance.now()
  const targetFrameMs = 1000 / FPS;

  try {
    if (startDelay > 0) await sleep(startDelay);
    for (let i = 0; i <= N; i++) {
      const el = await renderFrame(i, N);
      el.style.width = W + "px";
      el.style.height = H + "px";
      el.style.boxSizing = "border-box";
      el.style.overflow = "hidden";
      hidden.appendChild(el);
      try {
        const frameCanvas = await toCanvas(el, {
          width: W, height: H, pixelRatio: PR, cacheBust: false,
        });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (fillColor) {
          ctx.fillStyle = fillColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(frameCanvas, 0, 0, canvas.width, canvas.height);
        onProgress("record", i / N);
      } finally {
        hidden.removeChild(el);
      }
      const elapsed = performance.now() - t0 - startDelay;
      const targetMs = (i + 1) * targetFrameMs;
      const wait = Math.max(minHold - (elapsed - i * targetFrameMs), 0);
      const pacing = Math.max(targetMs - elapsed, wait);
      if (pacing > 1) await sleep(pacing);
    }
    await sleep(900);
  } finally {
    try { recorder.stop(); } catch {}
    await stopped.catch(() => {});
    try { videoTrack.stop && videoTrack.stop(); } catch {}
    stream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
    if (hidden.parentNode) hidden.parentNode.removeChild(hidden);
  }

  const blob = new Blob(chunks, { type: mime.split(";")[0] });
  if (blob.size < 20_000) {
    console.warn("[hak] animated export is suspiciously small:", blob.size, "bytes");
  }
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
/**
 * Record a canvas directly. Skips html-to-image entirely, which is why
 * this hits true 60fps: we never clone the DOM per frame.
 *
 * stepFn(i) is called once per frame and is expected to advance physics
 * and redraw the canvas. Any audio scheduling also happens inside it
 * (WebAudio is sample-accurate, so as long as stepFn runs at the same
 * cadence as the frame loop, audio and video stay in sync).
 */
export async function recordCanvasAnimation(
  canvas: HTMLCanvasElement,
  stepFn: (frameIndex: number) => void,
  opts: {
    fps: number;
    frameCount: number;
    audioStream?: MediaStream | null;
    videoBitsPerSecond?: number;
    onProgress?: (phase: "record", progress: number) => void;
  },
): Promise<Blob> {
  const FPS = Math.max(1, opts.fps);
  const N = Math.max(2, opts.frameCount);
  const onProgress = opts.onProgress ?? (() => {});

  const audioTracks = opts.audioStream ? opts.audioStream.getAudioTracks() : [];
  const hasAudio = audioTracks.length > 0;

  const videoStream = (canvas as any).captureStream(FPS) as MediaStream;
  const stream: MediaStream = hasAudio
    ? new MediaStream([...videoStream.getVideoTracks(), ...audioTracks])
    : videoStream;

  const mime = pickMime(hasAudio);
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: opts.videoBitsPerSecond ?? (FPS >= 60 ? 12_000_000 : 6_000_000),
      audioBitsPerSecond: 96_000,
    });
  } catch (e) {
    stream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
    throw new Error("MediaRecorder could not start: " + String(e));
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise<void>((r) => { recorder.onstop = () => r(); });

  recorder.start();
  const t0 = performance.now();
  const frameMs = 1000 / FPS;

  try {
    for (let i = 0; i < N; i++) {
      stepFn(i);
      onProgress("record", (i + 1) / N);
      const target = t0 + (i + 1) * frameMs;
      const wait = target - performance.now();
      if (wait > 1) await sleep(wait);
    }
    // Hold last frame so the encoder flushes it.
    await sleep(750);
  } finally {
    try { recorder.stop(); } catch {}
    await stopped.catch(() => {});
    stream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
  }

  const blob = new Blob(chunks, { type: mime.split(";")[0] });
  if (blob.size < 20_000) {
    console.warn("[hak] canvas animation suspiciously small:", blob.size, "bytes");
  }
  return blob;
}
