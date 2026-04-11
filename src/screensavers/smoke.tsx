import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

interface SmokeSource {
  x: number;
  width: number;
  intensity: number;
}

interface SmokeState {
  density: number[][];
  sources: SmokeSource[];
  windOffset: number;
  windPhase: number;
  prevCols: number;
  prevRows: number;
}

function createSources(columns: number): SmokeSource[] {
  const count = Math.max(2, Math.floor(columns / 25));
  const sources: SmokeSource[] = [];
  for (let i = 0; i < count; i++) {
    sources.push({
      x: Math.floor(((i + 0.5) / count) * columns + (Math.random() - 0.5) * 8),
      width: 3 + Math.floor(Math.random() * 4),
      intensity: 180 + Math.floor(Math.random() * 76),
    });
  }
  return sources;
}

function createDensity(rows: number, columns: number): number[][] {
  return Array.from({ length: rows }, () => Array(columns).fill(0));
}

const Smoke: React.FC<ScreensaverProps> = ({ columns, rows, frame }) => {
  const stateRef = useRef<SmokeState | null>(null);

  const height = rows - 1;

  if (
    !stateRef.current ||
    stateRef.current.prevCols !== columns ||
    stateRef.current.prevRows !== height
  ) {
    stateRef.current = {
      density: createDensity(height, columns),
      sources: createSources(columns),
      windOffset: 0,
      windPhase: Math.random() * Math.PI * 2,
      prevCols: columns,
      prevRows: height,
    };
  }

  const state = stateRef.current;
  const { density, sources } = state;

  // Wind: gentle sinusoidal drift that changes over time
  state.windPhase += 0.008;
  const wind = Math.sin(state.windPhase) * 0.6;

  // Seed smoke at the bottom from each source
  for (const src of sources) {
    for (let dx = -src.width; dx <= src.width; dx++) {
      const sx = src.x + dx;
      if (sx >= 0 && sx < columns) {
        const falloff = 1 - Math.abs(dx) / (src.width + 1);
        const jitter = Math.random() * 40;
        density[height - 1][sx] = Math.min(
          255,
          density[height - 1][sx] +
            src.intensity * falloff * (0.6 + Math.random() * 0.4) +
            jitter,
        );
      }
    }
  }

  // Propagate smoke upward with diffusion, turbulence, and wind
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < columns; x++) {
      // Sample from below with wind offset
      const windShift = Math.round(
        wind + Math.sin(y * 0.15 + state.windPhase * 2) * 0.8,
      );

      const below = density[y + 1]?.[x - windShift] ?? 0;
      const belowLeft = density[y + 1]?.[x - 1 - windShift] ?? 0;
      const belowRight = density[y + 1]?.[x + 1 - windShift] ?? 0;
      const twoBelow = density[y + 2]?.[x - windShift] ?? 0;
      const left = density[y]?.[x - 1] ?? 0;
      const right = density[y]?.[x + 1] ?? 0;

      // Weighted average favoring the cell directly below
      const avg =
        (below * 4 + belowLeft * 2 + belowRight * 2 + twoBelow + left + right) /
        11;

      // Slower decay than fire for lingering wisps
      const decay = 1.5 + Math.random() * 2;
      // Turbulence: occasional density fluctuations
      const turbulence =
        Math.sin(x * 0.3 + y * 0.2 + frame * 0.05) * 3 * Math.random();

      density[y][x] = Math.max(0, avg - decay + turbulence);
    }
  }

  // Clear bottom row for next frame's seeding
  for (let x = 0; x < columns; x++) {
    density[height - 1][x] = 0;
  }

  // Map density to characters and grayscale colors
  const getCharAndColor = (
    d: number,
  ): { char: string; color: string } | null => {
    if (d > 180) return { char: "█", color: "#e8e8e8" };
    if (d > 140) return { char: "▓", color: "#d0d0d0" };
    if (d > 100) return { char: "▒", color: "#b0b0b0" };
    if (d > 65) return { char: "░", color: "#909090" };
    if (d > 35) return { char: "·", color: "#686868" };
    if (d > 15) return { char: ".", color: "#484848" };
    return null;
  };

  const output: React.ReactNode[] = [];
  for (let y = 0; y < height; y++) {
    const segments: React.ReactNode[] = [];
    let spaces = "";

    for (let x = 0; x < columns; x++) {
      const cell = getCharAndColor(density[y][x]);
      if (!cell) {
        spaces += " ";
      } else {
        if (spaces) {
          segments.push(spaces);
          spaces = "";
        }
        segments.push(
          <Text key={x} color={cell.color}>
            {cell.char}
          </Text>,
        );
      }
    }
    if (spaces) segments.push(spaces);

    output.push(
      <Box key={y}>
        <Text>{segments}</Text>
      </Box>,
    );
  }

  return <Box flexDirection="column">{output}</Box>;
};

export const smoke: ScreensaverModule = {
  name: "smoke",
  description:
    "Wispy smoke rising and dissipating with varying character density",
  component: Smoke,
  fps: 15,
};
