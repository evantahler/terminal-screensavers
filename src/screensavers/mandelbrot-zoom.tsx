import { Box } from "ink";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { renderSparseRow } from "./utils.js";

interface ZoomTarget {
  x: number;
  y: number;
}

const ZOOM_TARGETS: ZoomTarget[] = [
  { x: -0.7463, y: 0.1102 }, // Seahorse Valley
  { x: -0.1528, y: 1.0397 }, // Elephant Valley
  { x: -0.0452, y: 0.9868 }, // Double spiral
  { x: -1.7497, y: 0.0 }, // Mini Mandelbrot
  { x: -1.4011552, y: 0.0 }, // Antenna tip
];

const CHARS = " .:-=+*#%@";

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

function iterationToColor(iter: number, maxIter: number): string {
  const t = iter / maxIter;
  const hue = (t * 360 + 200) % 360;
  const lightness = 0.15 + t * 0.55;
  return hslToHex(hue, 0.85, lightness);
}

interface MandelbrotState {
  targetIndex: number;
  zoomLevel: number;
}

function MandelbrotZoom({ columns, rows }: ScreensaverProps) {
  const stateRef = useRef<MandelbrotState>({
    targetIndex: 0,
    zoomLevel: 0,
  });

  const state = stateRef.current;
  const displayRows = rows - 1;

  const target = ZOOM_TARGETS[state.targetIndex % ZOOM_TARGETS.length];
  const scale = 4.0 * 0.97 ** state.zoomLevel;

  // Cycle to next target when we hit float64 precision limits
  if (scale < 1e-14) {
    state.targetIndex++;
    state.zoomLevel = 0;
  } else {
    state.zoomLevel++;
  }

  const aspectRatio = (displayRows / columns) * 2.0;
  const xMin = target.x - scale;
  const xMax = target.x + scale;
  const yMin = target.y - scale * aspectRatio;
  const yMax = target.y + scale * aspectRatio;

  const maxIter = Math.min(80 + Math.floor(state.zoomLevel * 0.3), 150);

  const grid: (null | { char: string; color: string })[][] = Array.from(
    { length: displayRows },
    () => Array.from({ length: columns }, () => null),
  );

  for (let y = 0; y < displayRows; y++) {
    const cy = yMin + (y / displayRows) * (yMax - yMin);
    for (let x = 0; x < columns; x++) {
      const cx = xMin + (x / columns) * (xMax - xMin);

      let zr = 0;
      let zi = 0;
      let zr2 = 0;
      let zi2 = 0;
      let iter = 0;

      while (zr2 + zi2 <= 4 && iter < maxIter) {
        zi = 2 * zr * zi + cy;
        zr = zr2 - zi2 + cx;
        zr2 = zr * zr;
        zi2 = zi * zi;
        iter++;
      }

      if (iter >= maxIter) continue; // inside the set — leave as null

      const t = iter / maxIter;
      const charIdx = Math.min(
        Math.floor(t * (CHARS.length - 1)) + 1,
        CHARS.length - 1,
      );
      grid[y][x] = {
        char: CHARS[charIdx],
        color: iterationToColor(iter, maxIter),
      };
    }
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
}

export const mandelbrotZoom: ScreensaverModule = {
  name: "mandelbrot-zoom",
  description: "Continuous zoom into the Mandelbrot set with colored ASCII",
  component: MandelbrotZoom,
  fps: 8,
};
