import { Box } from "ink";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { renderSparseRow } from "./utils.js";

interface Ripple {
  cx: number;
  cy: number;
  birthFrame: number;
  amplitude: number;
  wavelength: number;
  speed: number;
}

const CHARS = [" ", "·", "~", "≈", "○", "●"];
const COLORS_PEAK = [
  "#003344",
  "#007799",
  "#00aacc",
  "#00ddee",
  "#00ffff",
  "#aaffff",
];
const COLORS_TROUGH = [
  "#003344",
  "#004466",
  "#005577",
  "#006699",
  "#0077aa",
  "#0088cc",
];

const THRESHOLDS = [0.05, 0.15, 0.3, 0.5, 0.7];

function createRipple(columns: number, rows: number, frame: number): Ripple {
  return {
    cx: Math.random() * columns,
    cy: Math.random() * rows,
    birthFrame: frame,
    amplitude: 0.8 + Math.random() * 0.2,
    wavelength: 6 + Math.random() * 4,
    speed: 0.4 + Math.random() * 0.3,
  };
}

function Ripples({ columns, rows, frame }: ScreensaverProps) {
  const stateRef = useRef<{
    ripples: Ripple[];
    nextSpawn: number;
  }>({
    ripples: [],
    nextSpawn: 0,
  });

  const state = stateRef.current;
  const displayRows = rows - 1;

  // Spawn initial ripples
  if (frame === 0) {
    state.ripples = Array.from({ length: 3 }, () =>
      createRipple(columns, displayRows, 0),
    );
    state.nextSpawn = 30 + Math.floor(Math.random() * 30);
  }

  // Spawn new ripples
  if (frame >= state.nextSpawn && state.ripples.length < 15) {
    state.ripples.push(createRipple(columns, displayRows, frame));
    state.nextSpawn = frame + 30 + Math.floor(Math.random() * 30);
  }

  // Precompute per-ripple values and prune dead ones
  const active: {
    ripple: Ripple;
    age: number;
    decay: number;
    wavefront: number;
  }[] = [];

  for (const ripple of state.ripples) {
    const age = frame - ripple.birthFrame;
    const decay = Math.exp(-age * 0.03);
    if (decay < 0.01) continue;
    active.push({
      ripple,
      age,
      decay,
      wavefront: ripple.speed * age + ripple.wavelength,
    });
  }

  state.ripples = active.map((a) => a.ripple);

  // Build wave field
  const grid: (null | { char: string; color: string })[][] = Array.from(
    { length: displayRows },
    () => Array.from({ length: columns }, () => null),
  );

  const TWO_PI = 2 * Math.PI;

  for (let y = 0; y < displayRows; y++) {
    for (let x = 0; x < columns; x++) {
      let sum = 0;

      for (const { ripple, age, decay, wavefront } of active) {
        const dx = x - ripple.cx;
        const dy = (y - ripple.cy) * 2; // aspect ratio correction
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > wavefront) continue;

        sum +=
          ripple.amplitude *
          Math.sin((TWO_PI * (dist - ripple.speed * age)) / ripple.wavelength) *
          decay;
      }

      if (sum === 0) continue;

      // Clamp
      const clamped = Math.max(-1, Math.min(1, sum));
      const abs = Math.abs(clamped);

      // Find character/color index
      let idx = 0;
      for (let t = 0; t < THRESHOLDS.length; t++) {
        if (abs >= THRESHOLDS[t]) idx = t + 1;
      }

      if (idx === 0) continue;

      const colors = clamped > 0 ? COLORS_PEAK : COLORS_TROUGH;
      grid[y][x] = { char: CHARS[idx], color: colors[idx] };
    }
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
}

export const ripples: ScreensaverModule = {
  name: "ripples",
  description: "Concentric ripples expanding like raindrops on a pond",
  component: Ripples,
  fps: 18,
};
