import { Box } from "ink";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { renderSparseRow } from "./utils.js";

const CHARS = ["·", "∘", "○", "◎", "●", "◆", "★", "✦", "❖", "✿"];

function hslToHex(h: number, s: number, l: number): string {
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

interface SourcePoint {
  x: number;
  y: number;
  freqX: number;
  freqY: number;
  phaseX: number;
  phaseY: number;
  amplitude: number;
}

interface LutEntry {
  r: number;
  angle: number;
  nx: number;
  ny: number;
}

interface KaleidoscopeState {
  sources: SourcePoint[];
  foldCount: number;
  foldTimer: number;
  hueOffset: number;
  lut: LutEntry[];
  lutCols: number;
  lutRows: number;
  colorCache: Map<string, string>;
}

const FOLD_MODES = [4, 6, 8];

function createSources(): SourcePoint[] {
  return Array.from({ length: 5 }, () => ({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    freqX: 0.3 + Math.random() * 0.7,
    freqY: 0.3 + Math.random() * 0.7,
    phaseX: Math.random() * Math.PI * 2,
    phaseY: Math.random() * Math.PI * 2,
    amplitude: 0.5 + Math.random() * 0.5,
  }));
}

function Kaleidoscope({ columns, rows, frame }: ScreensaverProps) {
  const stateRef = useRef<KaleidoscopeState>({
    sources: createSources(),
    foldCount: FOLD_MODES[0],
    foldTimer: 0,
    hueOffset: 0,
    lut: [],
    lutCols: 0,
    lutRows: 0,
    colorCache: new Map(),
  });

  const state = stateRef.current;
  const displayRows = rows - 1;

  // Cycle symmetry mode every ~400 frames
  state.foldTimer++;
  if (state.foldTimer > 400) {
    state.foldTimer = 0;
    const idx = (FOLD_MODES.indexOf(state.foldCount) + 1) % FOLD_MODES.length;
    state.foldCount = FOLD_MODES[idx];
    state.sources = createSources();
  }

  // Slowly cycle colors
  state.hueOffset = (frame * 0.5) % 360;

  const folds = state.foldCount;
  const time = frame * 0.02;
  const centerX = columns / 2;
  const centerY = displayRows / 2;
  const scaleX = Math.min(columns, displayRows * 2) / 2;
  const scaleY = scaleX / 2;

  // Rebuild LUT on resize
  if (state.lutCols !== columns || state.lutRows !== displayRows) {
    state.lutCols = columns;
    state.lutRows = displayRows;
    state.lut = new Array(columns * displayRows);
    for (let y = 0; y < displayRows; y++) {
      for (let x = 0; x < columns; x++) {
        const nx = (x - centerX) / scaleX;
        const ny = (y - centerY) / scaleY;
        const r = Math.sqrt(nx * nx + ny * ny);
        let angle = Math.atan2(ny, nx);
        if (angle < 0) angle += Math.PI * 2;
        state.lut[y * columns + x] = { r, angle, nx, ny };
      }
    }
  }

  // Clear color cache each frame (hueOffset changes)
  state.colorCache.clear();

  const grid: (null | { char: string; color: string })[][] = Array.from(
    { length: displayRows },
    () => Array.from({ length: columns }, () => null),
  );

  const segmentAngle = (Math.PI * 2) / folds;

  for (let y = 0; y < displayRows; y++) {
    for (let x = 0; x < columns; x++) {
      const entry = state.lut[y * columns + x];
      const { r, angle } = entry;

      if (r > 1.2) continue;

      // Fold the angle into one segment, then mirror
      let foldedAngle = angle % segmentAngle;
      const segmentIndex = Math.floor(angle / segmentAngle);
      if (segmentIndex % 2 === 1) {
        foldedAngle = segmentAngle - foldedAngle;
      }

      // Convert back to cartesian in the source segment space
      const sx = r * Math.cos(foldedAngle);
      const sy = r * Math.sin(foldedAngle);

      // Sample the pattern using multiple oscillating sources
      let value = 0;
      for (const src of state.sources) {
        const px = sx + src.amplitude * Math.sin(time * src.freqX + src.phaseX);
        const py = sy + src.amplitude * Math.cos(time * src.freqY + src.phaseY);

        const dx = px - src.x;
        const dy = py - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        value += Math.sin(dist * 6 - time * 2) * 0.5;
        value += Math.cos((px + py) * 4 + time) * 0.3;
      }

      // Normalize value to 0..1
      const normalized = (Math.sin(value) + 1) / 2;

      // Edge fade
      const edgeFade = r > 1.0 ? Math.max(0, 1 - (r - 1.0) / 0.2) : 1;
      const intensity = normalized * edgeFade;

      if (intensity < 0.05) continue;

      const charIdx = Math.min(
        Math.floor(intensity * CHARS.length),
        CHARS.length - 1,
      );

      // Quantize color inputs for cache hits
      const hueRaw =
        (foldedAngle * (180 / Math.PI) * 3 + r * 120 + state.hueOffset) % 360;
      const hue = Math.round(hueRaw) % 360;
      const sat = Math.round((0.7 + intensity * 0.3) * 20) / 20;
      const lit = Math.round((0.25 + intensity * 0.4) * 20) / 20;

      const cacheKey = `${hue},${sat},${lit}`;
      let color = state.colorCache.get(cacheKey);
      if (!color) {
        color = hslToHex(hue, sat, lit);
        state.colorCache.set(cacheKey, color);
      }

      grid[y][x] = { char: CHARS[charIdx], color };
    }
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
}

export const kaleidoscope: ScreensaverModule = {
  name: "kaleidoscope",
  description:
    "Symmetrical patterns reflected across multiple axes with morphing colors",
  component: Kaleidoscope,
  fps: 15,
};
