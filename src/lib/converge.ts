"use client";

// Elliptical billiard simulation.
//
// Balls start at one focus and are launched in every direction. Each
// reflection off the elliptical wall is guaranteed by the reflection
// property of ellipses to pass through the other focus, so every ball
// alternates between the two foci forever. This is exact mathematics,
// not emergent chaos — the same pattern reproduces from the same seed.

export type PitchMap = "x" | "y" | "hue";

export interface ConvergeConfig {
  /** Number of simultaneous balls. 144 is the "beautiful" state. */
  balls: number;
  /** Speed as a fraction of canvas height per second. */
  speed: number;
  /** X semi-axis as a fraction of canvas width  (0.8 = ellipse spans 80% of width). */
  aFrac: number;
  /** Y semi-axis as a fraction of canvas height (0.6 = ellipse spans 60% of height). */
  bFrac: number;
  /** How quickly the trail layer fades each frame. 0.015 ≈ 2s trails. */
  trailFade: number;
  /** Emit a pluck every time a ball hits the wall. */
  wallHitSound: boolean;
  /** Which coordinate drives the pluck pitch. */
  pitchMap: PitchMap;
  /** "rainbow" or a hex colour. */
  ballColor: string;
  /** Ball head radius as a fraction of min(width, height). */
  ballRadiusFrac: number;
  /** Deterministic seed; same seed = same trajectories. */
  seed: number;
}

export const DEFAULT_CONVERGE: ConvergeConfig = {
  balls: 144,
  speed: 0.55,
  aFrac: 0.80,
  bFrac: 0.60,
  trailFade: 0.016,
  wallHitSound: true,
  pitchMap: "x",
  ballColor: "rainbow",
  ballRadiusFrac: 0.007,
  seed: 42,
}

/**
 * Parse the studio payload as a converge config.
 * Accepts: JSON object, plain number (ball count), or anything else
 * (falls back to defaults). No exceptions thrown.
 */
export function parseConvergeConfig(text: string): ConvergeConfig {
  const raw = (text || "").trim();
  if (!raw) return DEFAULT_CONVERGE;
  if (raw.startsWith("{")) {
    try {
      const obj = JSON.parse(raw);
      return { ...DEFAULT_CONVERGE, ...obj };
    } catch { /* fall through */ }
  }
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) {
    return { ...DEFAULT_CONVERGE, balls: Math.min(2000, Math.floor(n)) };
  }
  return DEFAULT_CONVERGE;
}

export function convergeConfigJson(cfg: ConvergeConfig = DEFAULT_CONVERGE): string {
  return JSON.stringify(cfg, null, 2);
}

export interface Hit {
  ballIndex: number;
  /** Hit x normalised to -1..1 (canvas-relative, 0 = centre). */
  x: number;
  /** Hit y normalised to -1..1. */
  y: number;
  /** Ball hue, 0-360. */
  hue: number;
}

interface Ball {
  x: number; y: number;
  vx: number; vy: number;
  prevX: number; prevY: number;
  hue: number;
  hitCooldown: number;
}

function mulberry32(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ConvergeSim {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  config: ConvergeConfig;
  private rng: () => number;
  private balls: Ball[] = [];
  private glow: HTMLCanvasElement | null = null;

  constructor(canvas: HTMLCanvasElement, config: ConvergeConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
    this.config = config;
    this.rng = mulberry32(config.seed);
    this.buildGlowSprite();
    this.reset();
  }

  private buildGlowSprite() {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    this.glow = c;
  }

  get a(): number { return (this.config.aFrac * this.canvas.width) / 2; }
  get b(): number { return (this.config.bFrac * this.canvas.height) / 2; }
  get speed(): number { return this.config.speed * this.canvas.height; }
  get ballRadius(): number {
    const m = Math.min(this.canvas.width, this.canvas.height);
    return Math.max(2, this.config.ballRadiusFrac * m);
  }
  get c(): number { return Math.sqrt(Math.abs(this.b * this.b - this.a * this.a)); }

  private focus1(): [number, number] {
    return this.b >= this.a ? [0, -this.c] : [-this.c, 0];
  }
  private focus2(): [number, number] {
    return this.b >= this.a ? [0, this.c] : [this.c, 0];
  }

  reset() {
    this.balls = [];
    const [fx, fy] = this.focus1();
    const N = Math.max(1, Math.floor(this.config.balls));
    const sp = this.speed;
    for (let i = 0; i < N; i++) {
      // Even angular spread with a tiny jitter so it does not look
      // like a perfectly-regular fan on the first frame.
      const angle = (i / N) * Math.PI * 2 + (this.rng() - 0.5) * 0.008;
      this.balls.push({
        x: fx, y: fy,
        vx: Math.cos(angle) * sp,
        vy: Math.sin(angle) * sp,
        prevX: fx, prevY: fy,
        hue: (i / N) * 360,
        hitCooldown: 0,
      });
    }
    this.clear()
  }

  clear() {
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  resize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.reset();
  }

  /**
   * Advance one physics step. Returns wall hits from this frame.
   */
  step(dt: number): Hit[] {
    const hits: Hit[] = [];
    const a = this.a, b = this.b;
    const a2 = a * a, b2 = b * b;
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i];
      if (ball.hitCooldown > 0) ball.hitCooldown = Math.max(0, ball.hitCooldown - dt);
      ball.prevX = ball.x; ball.prevY = ball.y;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      const F = (ball.x * ball.x) / a2 + (ball.y * ball.y) / b2;
      if (F > 1) {
        // Bisect back to the wall.
        const x0 = ball.prevX, y0 = ball.prevY;
        let lo = 0, hi = dt;
        for (let k = 0; k < 22; k++) {
          const tm = (lo + hi) / 2;
          const xm = x0 + ball.vx * tm;
          const ym = y0 + ball.vy * tm;
          if ((xm * xm) / a2 + (ym * ym) / b2 > 1) hi = tm; else lo = tm;
        }
        const tHit = (lo + hi) / 2;
        ball.x = x0 + ball.vx * tHit;
        ball.y = y0 + ball.vy * tHit;
        // Ellipse surface normal is proportional to (x/a^2, y/b^2).
        let nx = ball.x / a2;
        let ny = ball.y / b2;
        const nl = Math.hypot(nx, ny) || 1;
        nx /= nl; ny /= nl;
        // Reflect: v′ = v − 2(v·n)n
        const vn = ball.vx * nx + ball.vy * ny;
        ball.vx -= 2 * vn * nx;
        ball.vy -= 2 * vn * ny;
        // Consume the remainder of the timestep.
        const rem = dt - tHit;
        ball.x += ball.vx * rem;
        ball.y += ball.vy * rem;
        if (ball.hitCooldown === 0) {
          hits.push({
            ballIndex: i,
            x: ball.x / a,
            y: ball.y / b,
            hue: ball.hue,
          });
          // Per-ball cooldown: prevents a grazing hit from spamming
          // the audio graph with two notes in the same frame.
          ball.hitCooldown = 0.045;
        }
      }
    }
    return hits;
  }

  render() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const cx = W / 2, cy = H / 2;
    const a = this.a, b = this.b;
    // Fade previous frame contents slightly.
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0," + this.config.trailFade + ")";
    ctx.fillRect(0, 0, W, H);
    // Trail segments.
    ctx.lineWidth = Math.max(1, W * 0.0015);
    ctx.lineCap = "round";
    for (const ball of this.balls) {
      const color = this.config.ballColor === "rainbow"
        ? "hsl(" + ball.hue + ",95%,60%)"
        : this.config.ballColor;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(cx + ball.prevX, cy + ball.prevY);
      ctx.lineTo(cx + ball.x, cy + ball.y);
      ctx.stroke();
    }
    // Ball heads — pre-rendered glow sprite, one drawImage per ball.
    if (this.glow) {
      const r = this.ballRadius;
      const size = r * 4.5;
      for (const ball of this.balls) {
        const x = cx + ball.x, y = cy + ball.y;
        if (this.config.ballColor === "rainbow") {
          ctx.globalAlpha = 0.85;
          // Coloured dot on top, white core.
          ctx.fillStyle = "hsl(" + ball.hue + ",95%,65%)";
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.drawImage(this.glow, x - size/2, y - size/2, size, size);
      }
    }
    // Ellipse wall with cyan glow.
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(3, W * 0.004);
    ctx.strokeStyle = "hsl(180, 95%, 68%)";
    ctx.shadowColor = "hsl(180, 95%, 68%)";
    ctx.shadowBlur = Math.max(14, W * 0.02);
    ctx.beginPath();
    ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Focus markers.
    const [f1x, f1y] = this.focus1();
    const [f2x, f2y] = this.focus2();
    ctx.strokeStyle = "rgba(255,200,110,0.55)";
    ctx.lineWidth = Math.max(1.5, W * 0.0018);
    const fr = Math.max(8, W * 0.014);
    for (const [fx, fy] of [[f1x, f1y], [f2x, f2y]]) {
      ctx.beginPath();
      ctx.arc(cx + fx, cy + fy, fr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** Order hits so the loudest / most spread-out ones survive throttling. */
export function prioritizeHits(hits: Hit[], max = 3): Hit[] {
  if (hits.length <= max) return hits;
  // Keep the widest-spread hits so left/right stereo-ish variety survives.
  const sorted = [...hits].sort((a, b) => Math.abs(b.x) - Math.abs(a.x));
  return sorted.slice(0, max);
}