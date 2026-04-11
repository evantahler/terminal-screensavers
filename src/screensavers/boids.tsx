import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Predator {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface State {
  boids: Boid[];
  predator: Predator | null;
  predatorCooldown: number;
  initialized: boolean;
  colorCache: Map<number, string>;
}

const NUM_BOIDS = 60;
const MAX_SPEED = 1.2;
const MIN_SPEED = 0.3;
const SEPARATION_RADIUS = 4;
const NEIGHBOR_RADIUS = 12;
const SEPARATION_WEIGHT = 0.05;
const ALIGNMENT_WEIGHT = 0.03;
const COHESION_WEIGHT = 0.01;
const PREDATOR_FEAR_RADIUS = 15;
const PREDATOR_FLEE_WEIGHT = 0.15;
const ASPECT_RATIO = 2.0; // terminal chars are ~2x tall as wide

function createBoid(columns: number, rows: number): Boid {
  const angle = Math.random() * Math.PI * 2;
  const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
  return {
    x: Math.random() * columns,
    y: Math.random() * rows,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

function wrapPosition(boid: Boid, columns: number, rows: number): void {
  if (boid.x < 0) boid.x += columns;
  else if (boid.x >= columns) boid.x -= columns;
  if (boid.y < 0) boid.y += rows;
  else if (boid.y >= rows) boid.y -= rows;
}

function toroidalDx(x1: number, x2: number, width: number): number {
  let dx = x2 - x1;
  if (dx > width / 2) dx -= width;
  else if (dx < -width / 2) dx += width;
  return dx;
}

function toroidalDy(y1: number, y2: number, height: number): number {
  let dy = y2 - y1;
  if (dy > height / 2) dy -= height;
  else if (dy < -height / 2) dy += height;
  return dy;
}

function directionChar(vx: number, vy: number): string {
  const angle = Math.atan2(vy * ASPECT_RATIO, vx);
  // 8 directions: map angle to character
  const sector = Math.round((angle / (Math.PI * 2)) * 8 + 8) % 8;
  const chars = [">", "\\", "v", "/", "<", "\\", "^", "/"];
  return chars[sector];
}

function angleToColor(vx: number, vy: number): string {
  const angle = Math.atan2(vy, vx);
  // Map angle to hue (0-360)
  const hue = ((angle / (Math.PI * 2)) * 360 + 360) % 360;
  // HSL to RGB with fixed saturation=80%, lightness=60%
  const s = 0.8;
  const l = 0.6;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (v: number) =>
    Math.floor((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function createPredator(columns: number, rows: number): Predator {
  // Spawn from a random edge
  const edge = Math.floor(Math.random() * 4);
  let x: number;
  let y: number;
  let vx: number;
  let vy: number;
  const speed = 0.8;
  if (edge === 0) {
    // left
    x = 0;
    y = Math.random() * rows;
    vx = speed;
    vy = (Math.random() - 0.5) * speed * 0.5;
  } else if (edge === 1) {
    // right
    x = columns - 1;
    y = Math.random() * rows;
    vx = -speed;
    vy = (Math.random() - 0.5) * speed * 0.5;
  } else if (edge === 2) {
    // top
    x = Math.random() * columns;
    y = 0;
    vx = (Math.random() - 0.5) * speed * 0.5;
    vy = speed;
  } else {
    // bottom
    x = Math.random() * columns;
    y = rows - 1;
    vx = (Math.random() - 0.5) * speed * 0.5;
    vy = -speed;
  }
  return { x, y, vx, vy, life: 250 };
}

const Boids: React.FC<ScreensaverProps> = ({ columns, rows }) => {
  const stateRef = useRef<State>({
    boids: [],
    predator: null,
    predatorCooldown: 200,
    initialized: false,
    colorCache: new Map(),
  });

  const s = stateRef.current;
  const contentRows = rows - 1;

  if (!s.initialized) {
    s.initialized = true;
    for (let i = 0; i < NUM_BOIDS; i++) {
      s.boids.push(createBoid(columns, contentRows));
    }
  }

  // Update predator
  s.predatorCooldown--;
  if (!s.predator && s.predatorCooldown <= 0) {
    s.predator = createPredator(columns, contentRows);
  }
  if (s.predator) {
    s.predator.x += s.predator.vx;
    s.predator.y += s.predator.vy;
    s.predator.life--;
    if (
      s.predator.life <= 0 ||
      s.predator.x < -10 ||
      s.predator.x > columns + 10 ||
      s.predator.y < -10 ||
      s.predator.y > contentRows + 10
    ) {
      s.predator = null;
      s.predatorCooldown = 300 + Math.floor(Math.random() * 200);
    }
  }

  // Update boids
  for (const boid of s.boids) {
    let sepX = 0;
    let sepY = 0;
    let alignVx = 0;
    let alignVy = 0;
    let cohX = 0;
    let cohY = 0;
    let neighborCount = 0;

    for (const other of s.boids) {
      if (other === boid) continue;
      const dx = toroidalDx(boid.x, other.x, columns);
      const dy = toroidalDy(boid.y, other.y, contentRows);
      const dist = Math.sqrt(dx * dx + (dy * ASPECT_RATIO) ** 2);

      if (dist < SEPARATION_RADIUS && dist > 0) {
        sepX -= dx / dist;
        sepY -= dy / dist;
      }
      if (dist < NEIGHBOR_RADIUS) {
        alignVx += other.vx;
        alignVy += other.vy;
        cohX += dx;
        cohY += dy;
        neighborCount++;
      }
    }

    // Apply forces
    boid.vx += sepX * SEPARATION_WEIGHT;
    boid.vy += sepY * SEPARATION_WEIGHT;

    if (neighborCount > 0) {
      alignVx /= neighborCount;
      alignVy /= neighborCount;
      boid.vx += (alignVx - boid.vx) * ALIGNMENT_WEIGHT;
      boid.vy += (alignVy - boid.vy) * ALIGNMENT_WEIGHT;

      cohX /= neighborCount;
      cohY /= neighborCount;
      boid.vx += cohX * COHESION_WEIGHT;
      boid.vy += cohY * COHESION_WEIGHT;
    }

    // Flee from predator
    if (s.predator) {
      const pdx = toroidalDx(boid.x, s.predator.x, columns);
      const pdy = toroidalDy(boid.y, s.predator.y, contentRows);
      const pDist = Math.sqrt(pdx * pdx + (pdy * ASPECT_RATIO) ** 2);
      if (pDist < PREDATOR_FEAR_RADIUS && pDist > 0) {
        const fleeFactor =
          PREDATOR_FLEE_WEIGHT * (1 - pDist / PREDATOR_FEAR_RADIUS);
        boid.vx -= (pdx / pDist) * fleeFactor;
        boid.vy -= (pdy / pDist) * fleeFactor;
      }
    }

    // Clamp speed
    const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
    if (speed > MAX_SPEED) {
      boid.vx = (boid.vx / speed) * MAX_SPEED;
      boid.vy = (boid.vy / speed) * MAX_SPEED;
    } else if (speed < MIN_SPEED && speed > 0) {
      boid.vx = (boid.vx / speed) * MIN_SPEED;
      boid.vy = (boid.vy / speed) * MIN_SPEED;
    }

    // Move and wrap
    boid.x += boid.vx;
    boid.y += boid.vy;
    wrapPosition(boid, columns, contentRows);
  }

  // Build grid
  const grid: (SparseCell | null)[][] = Array.from(
    { length: contentRows },
    () => Array(columns).fill(null),
  );

  // Render boids
  for (const boid of s.boids) {
    const bx = Math.floor(boid.x);
    const by = Math.floor(boid.y);
    if (bx >= 0 && bx < columns && by >= 0 && by < contentRows) {
      const angle = Math.atan2(boid.vy, boid.vx);
      const quantizedDeg =
        Math.round((((angle / (Math.PI * 2)) * 360 + 360) % 360) / 5) * 5;
      let color = s.colorCache.get(quantizedDeg);
      if (!color) {
        color = angleToColor(boid.vx, boid.vy);
        s.colorCache.set(quantizedDeg, color);
      }
      grid[by][bx] = {
        char: directionChar(boid.vx, boid.vy),
        color,
      };
    }
  }

  // Render predator
  if (s.predator) {
    const px = Math.floor(s.predator.x);
    const py = Math.floor(s.predator.y);
    if (px >= 0 && px < columns && py >= 0 && py < contentRows) {
      grid[py][px] = { char: "@", color: "#ff2222", bold: true };
    }
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
};

export const boids: ScreensaverModule = {
  name: "boids",
  description:
    "Flocking simulation with boids that separate, align, and cohere",
  component: Boids,
  fps: 20,
};
