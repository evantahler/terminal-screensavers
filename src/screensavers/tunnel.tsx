import { Box } from "ink";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

const DENSITY_CHARS = ["@", "#", "%", "=", "+", "-", ":", ".", " "];

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

interface LutEntry {
  angle: number;
  distance: number;
}

interface TunnelState {
  lut: LutEntry[];
  lutCols: number;
  lutRows: number;
}

const Tunnel = ({ columns, rows, elapsed }: ScreensaverProps) => {
  const stateRef = useRef<TunnelState>({
    lut: [],
    lutCols: 0,
    lutRows: 0,
  });

  const displayRows = rows - 1;
  const state = stateRef.current;

  // Recompute LUT when terminal size changes
  if (state.lutCols !== columns || state.lutRows !== displayRows) {
    const centerX = columns / 2;
    const centerY = displayRows / 2;
    const lut: LutEntry[] = new Array(columns * displayRows);

    for (let y = 0; y < displayRows; y++) {
      for (let x = 0; x < columns; x++) {
        const dx = x - centerX;
        const dy = (y - centerY) * 2; // aspect ratio correction
        const dist = Math.sqrt(dx * dx + dy * dy);
        lut[y * columns + x] = {
          angle: Math.atan2(dy, dx),
          distance: 1 / (dist + 0.5),
        };
      }
    }

    state.lut = lut;
    state.lutCols = columns;
    state.lutRows = displayRows;
  }

  const zoomOffset = elapsed * 0.0004;
  const rotationOffset = elapsed * 0.00008;
  const { lut } = state;

  const grid: (SparseCell | null)[][] = Array.from(
    { length: displayRows },
    () => new Array(columns).fill(null),
  );

  for (let y = 0; y < displayRows; y++) {
    for (let x = 0; x < columns; x++) {
      const entry = lut[y * columns + x];
      const u = entry.angle / Math.PI + rotationOffset;
      const v = entry.distance + zoomOffset;

      const texVal =
        (Math.sin(u * 8) * 0.5 + 0.5) * (Math.sin(v * 16) * 0.5 + 0.5);
      const brightness = texVal * Math.min(1, entry.distance * 30);
      const charIndex = Math.floor(
        (1 - brightness) * (DENSITY_CHARS.length - 1),
      );

      if (charIndex >= DENSITY_CHARS.length - 1) continue;

      const hue = (((u * 180 + v * 360 + elapsed * 0.05) % 360) + 360) % 360;
      const lightness = 0.2 + brightness * 0.5;

      grid[y][x] = {
        char: DENSITY_CHARS[charIndex],
        color: hslToHex(hue, 0.8, lightness),
      };
    }
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
};

export const tunnel: ScreensaverModule = {
  name: "tunnel",
  description: "Spiraling tunnel vortex zooming toward the viewer",
  component: Tunnel,
  fps: 15,
};
