import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

interface GravitySource {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  trail: { x: number; y: number }[];
}

interface State {
  sources: GravitySource[];
  particles: Particle[];
  initialized: boolean;
}

const MAX_PARTICLES = 80;
const TRAIL_LENGTH = 12;
const G = 0.4;
const SPAWN_RATE = 0.15;
const MAX_SPEED = 3;

function createSource(columns: number, rows: number): GravitySource {
  return {
    x: columns * 0.2 + Math.random() * columns * 0.6,
    y: rows * 0.2 + Math.random() * rows * 0.6,
    vx: (Math.random() - 0.5) * 0.15,
    vy: (Math.random() - 0.5) * 0.08,
    mass: 30 + Math.random() * 40,
  };
}

function createParticle(
  columns: number,
  rows: number,
  sources: GravitySource[],
): Particle {
  // Spawn near a random gravity source with tangential velocity
  const source = sources[Math.floor(Math.random() * sources.length)];
  const angle = Math.random() * Math.PI * 2;
  const dist = 5 + Math.random() * 15;
  const x = source.x + Math.cos(angle) * dist;
  const y = source.y + Math.sin(angle) * dist * 0.5;
  // Tangential velocity for orbital motion
  const speed = 0.5 + Math.random() * 0.8;
  const vx = -Math.sin(angle) * speed;
  const vy = Math.cos(angle) * speed * 0.5;
  return {
    x,
    y,
    vx,
    vy,
    life: 200 + Math.floor(Math.random() * 300),
    trail: [],
  };
}

function velocityToColor(speed: number): string {
  // Blue (slow) -> cyan -> green -> yellow -> red (fast)
  const t = Math.min(speed / MAX_SPEED, 1);
  if (t < 0.25) {
    const f = t / 0.25;
    const r = 0;
    const g = Math.floor(f * 128);
    const b = 180 + Math.floor(f * 75);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
  if (t < 0.5) {
    const f = (t - 0.25) / 0.25;
    const r = 0;
    const g = 128 + Math.floor(f * 127);
    const b = 255 - Math.floor(f * 100);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
  if (t < 0.75) {
    const f = (t - 0.5) / 0.25;
    const r = Math.floor(f * 255);
    const g = 255;
    const b = Math.floor(155 - f * 155);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
  const f = (t - 0.75) / 0.25;
  const r = 255;
  const g = Math.floor(255 - f * 200);
  const b = 0;
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

const GravityWells: React.FC<ScreensaverProps> = ({ columns, rows }) => {
  const stateRef = useRef<State>({
    sources: [],
    particles: [],
    initialized: false,
  });

  const s = stateRef.current;
  const contentRows = rows - 1;

  // Initialize
  if (!s.initialized) {
    s.initialized = true;
    const numSources = 2 + Math.floor(Math.random() * 3); // 2-4
    for (let i = 0; i < numSources; i++) {
      s.sources.push(createSource(columns, contentRows));
    }
    // Seed initial particles
    for (let i = 0; i < 40; i++) {
      s.particles.push(createParticle(columns, contentRows, s.sources));
    }
  }

  // Drift gravity sources
  for (const src of s.sources) {
    src.x += src.vx;
    src.y += src.vy;
    // Bounce off edges
    if (src.x < columns * 0.1 || src.x > columns * 0.9) src.vx = -src.vx;
    if (src.y < contentRows * 0.1 || src.y > contentRows * 0.9)
      src.vy = -src.vy;
  }

  // Spawn new particles
  if (s.particles.length < MAX_PARTICLES && Math.random() < SPAWN_RATE) {
    s.particles.push(createParticle(columns, contentRows, s.sources));
  }

  // Update particles with gravity
  const alive: Particle[] = [];
  for (const p of s.particles) {
    // Save trail point
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > TRAIL_LENGTH) p.trail.shift();

    // Apply gravity from each source
    for (const src of s.sources) {
      const dx = src.x - p.x;
      const dy = (src.y - p.y) * 2; // Compensate for terminal aspect ratio
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      if (dist < 1.5) continue; // Avoid singularity
      const force = (G * src.mass) / distSq;
      p.vx += (force * dx) / dist;
      p.vy += ((force * dy) / dist) * 0.5; // Aspect ratio correction
    }

    // Clamp speed
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > MAX_SPEED) {
      p.vx = (p.vx / speed) * MAX_SPEED;
      p.vy = (p.vy / speed) * MAX_SPEED;
    }

    // Move
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;

    // Keep alive if in bounds and has life
    const margin = 10;
    if (
      p.life > 0 &&
      p.x > -margin &&
      p.x < columns + margin &&
      p.y > -margin &&
      p.y < contentRows + margin
    ) {
      alive.push(p);
    }
  }
  s.particles = alive;

  // Build grid
  const grid: (SparseCell | null)[][] = Array.from(
    { length: contentRows },
    () => Array(columns).fill(null),
  );

  // Render trails
  for (const p of s.particles) {
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const color = velocityToColor(speed);

    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i];
      const tx = Math.floor(t.x);
      const ty = Math.floor(t.y);
      if (tx >= 0 && tx < columns && ty >= 0 && ty < contentRows) {
        const fade = i / p.trail.length;
        const trailChars = [".", "·", "∙", "•", "●"];
        const ci = Math.floor(fade * (trailChars.length - 1));
        // Dim trail color
        const dimFactor = 0.3 + fade * 0.5;
        const r = Math.floor(
          Number.parseInt(color.slice(1, 3), 16) * dimFactor,
        );
        const g = Math.floor(
          Number.parseInt(color.slice(3, 5), 16) * dimFactor,
        );
        const b = Math.floor(
          Number.parseInt(color.slice(5, 7), 16) * dimFactor,
        );
        const dimColor = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        if (!grid[ty][tx]) {
          grid[ty][tx] = { char: trailChars[ci], color: dimColor };
        }
      }
    }

    // Render particle head
    const px = Math.floor(p.x);
    const py = Math.floor(p.y);
    if (px >= 0 && px < columns && py >= 0 && py < contentRows) {
      grid[py][px] = { char: "◉", color, bold: true };
    }
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
};

export const gravityWells: ScreensaverModule = {
  name: "gravity-wells",
  description:
    "Particles orbiting invisible gravity sources with colored trails",
  component: GravityWells,
  fps: 15,
};
