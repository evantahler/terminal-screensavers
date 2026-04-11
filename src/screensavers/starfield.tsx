import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { renderSparseRow } from "./utils.js";

interface Star {
  x: number;
  y: number;
  z: number;
}

function createStar(): Star {
  return {
    x: (Math.random() - 0.5) * 200,
    y: (Math.random() - 0.5) * 200,
    z: Math.random() * 100,
  };
}

function Starfield({ columns, rows }: ScreensaverProps) {
  const starsRef = useRef<Star[]>(
    Array.from({ length: 150 }, () => createStar()),
  );
  const stars = starsRef.current;

  const cx = Math.floor(columns / 2);
  const cy = Math.floor(rows / 2);

  const DEPTH_LEVELS: {
    threshold: number;
    char: string;
    color: string;
    bold?: boolean;
  }[] = [
    { threshold: 0.8, char: "@", color: "white", bold: true },
    { threshold: 0.5, char: "*", color: "#cccccc" },
    { threshold: 0.2, char: "+", color: "#888888" },
    { threshold: 0, char: ".", color: "#555555" },
  ];

  // Build grid
  const grid: (null | { char: string; color: string; bold?: boolean })[][] =
    Array.from({ length: rows - 1 }, () =>
      Array.from({ length: columns }, () => null),
    );

  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];

    // Move star toward viewer
    star.z -= 1.5;
    if (star.z <= 0) {
      Object.assign(star, createStar());
      star.z = 100;
      continue;
    }

    // Project to 2D
    const sx = Math.floor(cx + (star.x / star.z) * 40);
    const sy = Math.floor(cy + (star.y / star.z) * 20);

    if (sx < 0 || sx >= columns || sy < 0 || sy >= rows - 1) continue;

    const depth = 1 - star.z / 100;
    const level =
      DEPTH_LEVELS.find((l) => depth > l.threshold) ??
      DEPTH_LEVELS[DEPTH_LEVELS.length - 1];
    grid[sy][sx] = { char: level.char, color: level.color, bold: level.bold };
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
}

export const starfield: ScreensaverModule = {
  name: "starfield",
  description: "3D stars flying toward the viewer",
  component: Starfield,
  fps: 20,
};
