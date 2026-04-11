import { Box } from "ink";
import React from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { renderSparseRow } from "./utils.js";

const COLORS = ["#87CEEB", "#00CED1", "#E0FFFF", "#B0E0E6", "white"];
const HIGHLIGHT_COLOR = "#FFFFFF";

interface Bubble {
  x: number;
  y: number;
  size: number; // 0=small, 1=medium, 2=large
  wobbleOffset: number;
  speed: number;
  color: string;
  popping: number; // 0=alive, 1-3=pop frames remaining
}

function spawnBubble(columns: number, rows: number): Bubble {
  const size = Math.random() < 0.5 ? 0 : Math.random() < 0.6 ? 1 : 2;
  const speed = size === 0 ? 0.3 : size === 1 ? 0.2 : 0.15;
  return {
    x: Math.floor(Math.random() * (columns - 4)) + 2,
    y: rows - 2,
    size,
    wobbleOffset: Math.random() * Math.PI * 2,
    speed: speed + Math.random() * 0.1,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    popping: 0,
  };
}

type GridCell = { char: string; color: string; bold?: boolean } | null;

function setCell(
  grid: GridCell[][],
  row: number,
  col: number,
  char: string,
  color: string,
  bold?: boolean,
) {
  if (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length) {
    grid[row][col] = { char, color, bold };
  }
}

function drawBubble(grid: GridCell[][], bubble: Bubble, frame: number) {
  const wobbleAmplitude = bubble.size === 0 ? 1 : bubble.size === 1 ? 1.5 : 2;
  const wx = Math.round(
    bubble.x + Math.sin(frame * 0.08 + bubble.wobbleOffset) * wobbleAmplitude,
  );
  const ry = Math.round(bubble.y);

  if (bubble.popping > 0) {
    const popChar =
      bubble.popping === 3 ? "*" : bubble.popping === 2 ? "+" : "·";
    setCell(grid, ry, wx, popChar, bubble.color, true);
    return;
  }

  if (bubble.size === 0) {
    const char = Math.random() > 0.5 ? "°" : "·";
    setCell(grid, ry, wx, char, bubble.color);
  } else if (bubble.size === 1) {
    setCell(grid, ry, wx, "○", bubble.color);
    setCell(grid, ry - 1, wx + 1, "'", HIGHLIGHT_COLOR, true);
  } else {
    // Large bubble: 3 rows tall, 4 chars wide
    setCell(grid, ry - 1, wx - 1, "╭", bubble.color);
    setCell(grid, ry - 1, wx, "─", bubble.color);
    setCell(grid, ry - 1, wx + 1, "╮", bubble.color);
    setCell(grid, ry, wx - 1, "│", bubble.color);
    setCell(grid, ry, wx + 1, "│", bubble.color);
    setCell(grid, ry + 1, wx - 1, "╰", bubble.color);
    setCell(grid, ry + 1, wx, "─", bubble.color);
    setCell(grid, ry + 1, wx + 1, "╯", bubble.color);
    // Highlight
    setCell(grid, ry - 1, wx, "˜", HIGHLIGHT_COLOR, true);
  }
}

const Bubbles: React.FC<ScreensaverProps> = ({ columns, rows, frame }) => {
  const bubblesRef = React.useRef<Bubble[]>([]);
  const bubbles = bubblesRef.current;

  const visibleRows = rows - 1;

  // Spawn new bubbles
  if (bubbles.length < 30 && Math.random() < 0.15) {
    bubbles.push(spawnBubble(columns, visibleRows));
  }

  // Update bubbles
  for (const bubble of bubbles) {
    if (bubble.popping > 0) {
      bubble.popping--;
    } else {
      bubble.y -= bubble.speed;
      if (bubble.y < 1) {
        bubble.popping = 3;
      }
    }
  }

  // Remove dead bubbles
  for (let i = bubbles.length - 1; i >= 0; i--) {
    if (bubbles[i].popping === 0 && bubbles[i].y < 0) {
      bubbles.splice(i, 1);
    }
  }

  // Build grid
  const grid: GridCell[][] = Array.from({ length: visibleRows }, () =>
    Array.from({ length: columns }, () => null),
  );

  for (const bubble of bubbles) {
    drawBubble(grid, bubble, frame);
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
};

export const bubbles: ScreensaverModule = {
  name: "bubbles",
  description: "Rising bubbles that wobble and pop",
  component: Bubbles,
  fps: 15,
};
