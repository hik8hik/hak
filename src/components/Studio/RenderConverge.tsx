"use client";
import { useEffect, useImperativeHandle, useRef } from "react";
import {
  ConvergeSim,
  parseConvergeConfig,
  prioritizeHits,
  DEFAULT_CONVERGE,
  type ConvergeConfig,
  type Hit,
} from "@/lib/converge";
import { getPreviewPluck, pluckFreqForX, pluckFreqForHue } from "@/lib/sound";

export interface ConvergeHandle {
  getCanvas: () => HTMLCanvasElement | null;
  getConfig: () => ConvergeConfig;
  reset: () => void;
}

interface Props {
  text: string;
  running: boolean;
  /** Preview only: play plucks through the speaker on wall hits. */
  withSound?: boolean;
  ref?: React.Ref<ConvergeHandle>;
}

export default function RenderConverge({ text, running, withSound = true, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<ConvergeSim | null>(null);
  const rafRef = useRef<number>(0);
  const lastTRef = useRef<number>(0);

  // (Re)create the sim whenever the payload changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cfg = parseConvergeConfig(text);
    const sim = new ConvergeSim(canvas, cfg);
    simRef.current = sim;

    const parent = canvas.parentElement;
    if (!parent) return;
    const resize = () => {
      const r = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sim.resize(Math.max(120, Math.round(r.width * dpr)), Math.max(160, Math.round(r.height * dpr)));
      canvas.style.width = r.width + "px";
      canvas.style.height = r.height + "px";
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    return () => { ro.disconnect(); };
  }, [text]);

  // Animation loop.
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    lastTRef.current = 0;
    if (!running) return;
    const loop = (t: number) => {
      const sim = simRef.current;
      if (!sim) { rafRef.current = requestAnimationFrame(loop); return; }
      const dt = lastTRef.current ? Math.min(0.05, (t - lastTRef.current) / 1000) : 1 / 60;
      lastTRef.current = t;
      const hits = sim.step(dt);
      if (withSound && sim.config.wallHitSound && hits.length) playPreviewHits(hits, sim.config);
      sim.render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, text, withSound]);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getConfig: () => simRef.current?.config ?? DEFAULT_CONVERGE,
    reset: () => simRef.current?.reset(),
  }), []);

  return (
    <div className="converge-stage">
      <canvas ref={canvasRef} />
    </div>
  );
}

function playPreviewHits(hits: Hit[], cfg: ConvergeConfig) {
  const kit = getPreviewPluck();
  for (const h of prioritizeHits(hits, 3)) {
    const freq =
      cfg.pitchMap === "hue" ? pluckFreqForHue(h.hue) :
      cfg.pitchMap === "y"   ? pluckFreqForX(-h.y) :
                               pluckFreqForX(h.x);
    kit.play(freq);
  }
}