import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
}

type EmitterMode = "fountain" | "explosion" | "rain" | "sparks";

interface Emitter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mode: EmitterMode;
  color: string;
  hue: number;
  spawnRate: number;
  framesAlive: number;
  lifetime: number;
}

interface State {
  particles: Particle[];
  emitters: Emitter[];
  wind: number;
  windTarget: number;
  initialized: boolean;
  colorCache: Map<number, string>;
}

const MODES: EmitterMode[] = ["fountain", "explosion", "rain", "sparks"];

const CHARS_BY_LIFE = ["░", "·", "•", "*", "✦"];

/** Quantize hue to nearest 3 degrees to improve cache hit rate. */
function quantizeHue(hue: number): number {
  return Math.round((((hue % 360) + 360) % 360) / 3) * 3;
}

function hueToHex(hue: number): string {
  const h = ((hue % 360) + 360) % 360;
  const s = 1;
  const l = 0.6;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function spawnParticles(
  emitter: Emitter,
  count: number,
  columns: number,
  rows: number,
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    let vx = 0;
    let vy = 0;
    let life = 0;

    switch (emitter.mode) {
      case "fountain": {
        const spread = 0.8;
        vx = (Math.random() - 0.5) * spread;
        vy = -(1.0 + Math.random() * 1.5);
        life = 30 + Math.floor(Math.random() * 25);
        break;
      }
      case "explosion": {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 2.0;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
        life = 15 + Math.floor(Math.random() * 20);
        break;
      }
      case "rain": {
        vx = (Math.random() - 0.5) * 0.3;
        vy = 0.5 + Math.random() * 1.0;
        life = 20 + Math.floor(Math.random() * 30);
        break;
      }
      case "sparks": {
        const sAngle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
        const sSpeed = 1.0 + Math.random() * 1.5;
        vx = Math.cos(sAngle) * sSpeed;
        vy = Math.sin(sAngle) * sSpeed;
        life = 10 + Math.floor(Math.random() * 15);
        break;
      }
    }

    particles.push({
      x: emitter.x,
      y: emitter.y,
      vx,
      vy,
      life,
      maxLife: life,
      hue: emitter.hue + (Math.random() - 0.5) * 30,
    });
  }
  return particles;
}

function createEmitter(columns: number, rows: number): Emitter {
  const mode = MODES[Math.floor(Math.random() * MODES.length)];
  const hue = Math.random() * 360;
  let x: number;
  let y: number;
  let vx = (Math.random() - 0.5) * 0.5;
  let vy = (Math.random() - 0.5) * 0.3;

  switch (mode) {
    case "fountain":
      x = Math.random() * columns;
      y = rows * 0.7 + Math.random() * rows * 0.2;
      break;
    case "explosion":
      x = columns * 0.2 + Math.random() * columns * 0.6;
      y = rows * 0.2 + Math.random() * rows * 0.5;
      vx = 0;
      vy = 0;
      break;
    case "rain":
      x = Math.random() * columns;
      y = 1 + Math.random() * 3;
      vx = 0.3 + Math.random() * 0.3;
      vy = 0;
      break;
    case "sparks":
      x = Math.random() * columns;
      y = rows * 0.8 + Math.random() * rows * 0.15;
      break;
  }

  return {
    x,
    y,
    vx,
    vy,
    mode,
    color: hueToHex(hue),
    hue,
    spawnRate: mode === "explosion" ? 0 : 3 + Math.floor(Math.random() * 4),
    framesAlive: 0,
    lifetime: 80 + Math.floor(Math.random() * 120),
  };
}

const ParticleSystem: React.FC<ScreensaverProps> = ({
  columns,
  rows,
  frame,
}) => {
  const stateRef = useRef<State>({
    particles: [],
    emitters: [],
    wind: 0,
    windTarget: 0,
    initialized: false,
    colorCache: new Map(),
  });

  const s = stateRef.current;
  const contentRows = rows - 1;

  // Initialize with emitters spread across the screen
  if (!s.initialized) {
    s.initialized = true;
    const seedModes: EmitterMode[] = [
      "fountain",
      "sparks",
      "explosion",
      "fountain",
    ];
    const seedHues = [0, 120, 240, 60];
    for (let i = 0; i < 4; i++) {
      const em = createEmitter(columns, contentRows);
      em.mode = seedModes[i];
      em.hue = seedHues[i];
      em.color = hueToHex(seedHues[i]);
      // Spread emitters across the width
      em.x = columns * (0.15 + (i * 0.7) / 3);
      if (em.mode === "fountain" || em.mode === "sparks") {
        em.y = contentRows * 0.75;
      } else {
        em.y = contentRows * 0.35;
      }
      em.spawnRate =
        em.mode === "explosion" ? 0 : 4 + Math.floor(Math.random() * 3);
      s.emitters.push(em);
    }
  }

  // Drift wind slowly
  if (frame % 30 === 0) {
    s.windTarget = (Math.random() - 0.5) * 0.15;
  }
  s.wind += (s.windTarget - s.wind) * 0.05;

  // Update emitters
  const liveEmitters: Emitter[] = [];
  for (const em of s.emitters) {
    em.framesAlive++;
    em.x += em.vx;
    em.y += em.vy;

    // Bounce emitters off edges
    if (em.x < 0 || em.x >= columns) em.vx *= -1;
    if (em.y < 0 || em.y >= contentRows) em.vy *= -1;
    em.x = Math.max(0, Math.min(columns - 1, em.x));
    em.y = Math.max(0, Math.min(contentRows - 1, em.y));

    // Spawn particles
    if (em.mode === "explosion" && em.framesAlive === 1) {
      s.particles.push(
        ...spawnParticles(
          em,
          25 + Math.floor(Math.random() * 15),
          columns,
          contentRows,
        ),
      );
    } else if (em.spawnRate > 0) {
      s.particles.push(
        ...spawnParticles(em, em.spawnRate, columns, contentRows),
      );
    }

    if (em.framesAlive < em.lifetime) {
      liveEmitters.push(em);
    }
  }
  s.emitters = liveEmitters;

  // Spawn new emitters to keep things interesting
  if (
    s.emitters.length < 2 ||
    (s.emitters.length < 4 && Math.random() < 0.02)
  ) {
    s.emitters.push(createEmitter(columns, contentRows));
  }

  // Update particles
  const liveParticles: Particle[] = [];
  for (const p of s.particles) {
    p.x += p.vx + s.wind;
    p.y += p.vy;
    p.vy += 0.04; // gravity
    p.vx *= 0.99; // drag
    p.life--;

    if (
      p.life > 0 &&
      p.y >= 0 &&
      p.y < contentRows &&
      p.x >= 0 &&
      p.x < columns
    ) {
      liveParticles.push(p);
    }
  }
  s.particles = liveParticles;

  // Build grid
  const grid: (SparseCell | null)[][] = Array.from(
    { length: contentRows },
    () => Array(columns).fill(null),
  );

  for (const p of s.particles) {
    const px = Math.floor(p.x);
    const py = Math.floor(p.y);
    if (px >= 0 && px < columns && py >= 0 && py < contentRows) {
      const lifeRatio = p.life / p.maxLife;
      const charIdx = Math.min(
        CHARS_BY_LIFE.length - 1,
        Math.floor(lifeRatio * CHARS_BY_LIFE.length),
      );
      // Shift hue as particle ages for a nice color fade
      const qHue = quantizeHue(p.hue + (1 - lifeRatio) * 60);
      let color = s.colorCache.get(qHue);
      if (!color) {
        color = hueToHex(qHue);
        s.colorCache.set(qHue, color);
      }
      grid[py][px] = {
        char: CHARS_BY_LIFE[charIdx],
        color,
        bold: lifeRatio > 0.7,
      };
    }
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
};

export const particleSystem: ScreensaverModule = {
  name: "particle-system",
  description:
    "Particle emitters with gravity, wind, and multiple modes: fountain, explosion, rain, sparks",
  component: ParticleSystem,
  fps: 20,
};
