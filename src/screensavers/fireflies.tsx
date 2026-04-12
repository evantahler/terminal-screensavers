import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phaseOffset: number;
  pulseSpeed: number;
  char: string;
  directionTimer: number;
  directionInterval: number;
}

const CHARS = ["*", "\u00B7", "\u2022", "\u2726"];

const COLORS = [
  "#ccff33",
  "#aaee22",
  "#88dd11",
  "#ffee55",
  "#ddcc22",
  "#bbff44",
];

function createFirefly(columns: number, rows: number): Firefly {
  return {
    x: Math.random() * columns,
    y: Math.random() * rows,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.15,
    phaseOffset: Math.random() * Math.PI * 2,
    pulseSpeed: 0.03 + Math.random() * 0.04,
    char: CHARS[Math.floor(Math.random() * CHARS.length)],
    directionTimer: 0,
    directionInterval: 60 + Math.floor(Math.random() * 120),
  };
}

function lerpColor(brightness: number): string {
  const idx = Math.min(
    Math.floor(brightness * COLORS.length),
    COLORS.length - 1,
  );
  return COLORS[idx];
}

const Fireflies: React.FC<ScreensaverProps> = ({
  columns,
  rows,
  frame,
}) => {
  const height = rows - 1;
  const count = Math.max(15, Math.min(30, Math.floor((columns * height) / 200)));

  const stateRef = useRef<{ flies: Firefly[]; prevCols: number; prevRows: number } | null>(null);

  if (!stateRef.current || stateRef.current.prevCols !== columns || stateRef.current.prevRows !== height) {
    stateRef.current = {
      flies: Array.from({ length: count }, () => createFirefly(columns, height)),
      prevCols: columns,
      prevRows: height,
    };
  }

  const state = stateRef.current;

  for (const fly of state.flies) {
    fly.directionTimer++;
    if (fly.directionTimer >= fly.directionInterval) {
      fly.directionTimer = 0;
      fly.directionInterval = 60 + Math.floor(Math.random() * 120);
      fly.vx = (Math.random() - 0.5) * 0.3;
      fly.vy = (Math.random() - 0.5) * 0.15;
    }

    fly.x += fly.vx;
    fly.y += fly.vy;

    if (fly.x < 0) { fly.x = 0; fly.vx = Math.abs(fly.vx); }
    if (fly.x >= columns) { fly.x = columns - 1; fly.vx = -Math.abs(fly.vx); }
    if (fly.y < 0) { fly.y = 0; fly.vy = Math.abs(fly.vy); }
    if (fly.y >= height) { fly.y = height - 1; fly.vy = -Math.abs(fly.vy); }
  }

  const grid: (SparseCell | null)[][] = Array.from({ length: height }, () =>
    new Array(columns).fill(null),
  );

  for (const fly of state.flies) {
    const brightness = (Math.sin(frame * fly.pulseSpeed + fly.phaseOffset) + 1) / 2;

    if (brightness < 0.15) continue;

    const sx = Math.floor(fly.x);
    const sy = Math.floor(fly.y);

    if (sx >= 0 && sx < columns && sy >= 0 && sy < height) {
      grid[sy][sx] = {
        char: fly.char,
        color: lerpColor(brightness),
        bold: brightness > 0.7,
      };
    }
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
};

export const fireflies: ScreensaverModule = {
  name: "fireflies",
  description: "Glowing fireflies drifting and pulsing in the dark",
  component: Fireflies,
  fps: 15,
};
