import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

interface Vertex {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

interface Polygon {
  vertices: Vertex[];
  trail: Vertex[][];
}

const TRAIL_LENGTH = 8;
const COLOR_SCHEMES = {
  cyan: ["\x1b[96m", "\x1b[36m", "\x1b[96m", "\x1b[36m"],
  magenta: ["\x1b[95m", "\x1b[35m", "\x1b[95m", "\x1b[35m"],
};

function initPolygon(columns: number, rows: number): Polygon {
  const vertices: Vertex[] = [];
  for (let i = 0; i < 4; i++) {
    vertices.push({
      x: Math.random() * columns,
      y: Math.random() * rows,
      dx: (Math.random() * 1.0 + 0.5) * (Math.random() < 0.5 ? 1 : -1),
      dy: (Math.random() * 1.0 + 0.5) * (Math.random() < 0.5 ? 1 : -1),
    });
  }
  return { vertices, trail: [] };
}

function updateVertex(v: Vertex, columns: number, rows: number): void {
  v.x += v.dx;
  v.y += v.dy;

  if (v.x <= 0 || v.x >= columns - 1) {
    v.dx = -v.dx;
    v.x = Math.max(0, Math.min(columns - 1, v.x));
  }
  if (v.y <= 0 || v.y >= rows - 1) {
    v.dy = -v.dy;
    v.y = Math.max(0, Math.min(rows - 1, v.y));
  }
}

function bresenhamLine(
  _x0: number,
  _y0: number,
  _x1: number,
  _y1: number,
  grid: string[][],
  color: string,
): void {
  let cx = Math.floor(_x0);
  let cy = Math.floor(_y0);
  const ex = Math.floor(_x1);
  const ey = Math.floor(_y1);

  const dx = Math.abs(ex - cx);
  const dy = Math.abs(ey - cy);
  const sx = cx < ex ? 1 : -1;
  const sy = cy < ey ? 1 : -1;
  let err = dx - dy;

  while (true) {
    if (cy >= 0 && cy < grid.length && cx >= 0 && cx < grid[0].length) {
      grid[cy][cx] = `${color}*\x1b[0m`;
    }

    if (cx === ex && cy === ey) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
}

function drawPolygon(
  polygon: Polygon,
  grid: string[][],
  colors: string[],
  trailIndex: number,
): void {
  const vertices = polygon.vertices;
  const colorIndex = trailIndex % colors.length;
  const color = colors[colorIndex];

  for (let i = 0; i < 4; i++) {
    const v0 = vertices[i];
    const v1 = vertices[(i + 1) % 4];
    bresenhamLine(v0.x, v0.y, v1.x, v1.y, grid, color);
  }
}

const Mystify: React.FC<ScreensaverProps> = ({ columns, rows, frame }) => {
  const state = useRef<{
    polygon1: Polygon;
    polygon2: Polygon;
    initialized: boolean;
  }>({
    polygon1: { vertices: [], trail: [] },
    polygon2: { vertices: [], trail: [] },
    initialized: false,
  });

  const height = rows - 1;

  if (!state.current.initialized) {
    state.current.polygon1 = initPolygon(columns, height);
    state.current.polygon2 = initPolygon(columns, height);
    state.current.initialized = true;
  }

  const { polygon1, polygon2 } = state.current;

  // Update vertices
  for (const v of polygon1.vertices) {
    updateVertex(v, columns, height);
  }
  for (const v of polygon2.vertices) {
    updateVertex(v, columns, height);
  }

  // Update trails
  polygon1.trail.push([...polygon1.vertices.map((v) => ({ ...v }))]);
  if (polygon1.trail.length > TRAIL_LENGTH) {
    polygon1.trail.shift();
  }

  polygon2.trail.push([...polygon2.vertices.map((v) => ({ ...v }))]);
  if (polygon2.trail.length > TRAIL_LENGTH) {
    polygon2.trail.shift();
  }

  // Create grid
  const grid: string[][] = Array.from({ length: height }, () =>
    Array.from({ length: columns }, () => " "),
  );

  // Draw trails for polygon1 (cyan/blue)
  for (let i = 0; i < polygon1.trail.length; i++) {
    const trailPolygon = { vertices: polygon1.trail[i], trail: [] };
    drawPolygon(trailPolygon, grid, COLOR_SCHEMES.cyan, i);
  }

  // Draw trails for polygon2 (magenta/red)
  for (let i = 0; i < polygon2.trail.length; i++) {
    const trailPolygon = { vertices: polygon2.trail[i], trail: [] };
    drawPolygon(trailPolygon, grid, COLOR_SCHEMES.magenta, i);
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => (
        <Box key={y}>
          <Text>{row.join("")}</Text>
        </Box>
      ))}
    </Box>
  );
};

export const mystify: ScreensaverModule = {
  name: "mystify",
  description: "Bouncing geometric shapes like the Windows classic",
  component: Mystify,
  fps: 15,
};
