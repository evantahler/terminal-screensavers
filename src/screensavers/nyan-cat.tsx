import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

// Nyan Cat sprite frames — pop-tart body cat with animated legs
// Frame 1: legs down
const CAT_FRAME_1 = [
  "  ,----.  ",
  "  |    |  ",
  " /|    |\\ ",
  "( |    | )",
  "  | ◕ ◕|  ",
  "  | ── |  ",
  "  '----'  ",
  "  || ||   ",
];

// Frame 2: legs tucked
const CAT_FRAME_2 = [
  "  ,----.  ",
  "  |    |  ",
  " /|    |\\ ",
  "( |    | )",
  "  | ◕ ◕|  ",
  "  | ── |  ",
  "  '----'  ",
  "   |  |   ",
];

// Frame 3: legs up
const CAT_FRAME_3 = [
  "  ,----.  ",
  "  |    |  ",
  " /|    |\\ ",
  "( |    | )",
  "  | ◕ ◕|  ",
  "  | ── |  ",
  "  '----'  ",
  "  // \\\\   ",
];

const CAT_FRAMES = [CAT_FRAME_1, CAT_FRAME_2, CAT_FRAME_3, CAT_FRAME_2];
const CAT_WIDTH = 10;
const CAT_HEIGHT = CAT_FRAME_1.length;

// Pop-tart body color (pinkish/tan)
const POPTART_COLOR = "#ffaa88";
// Cat features color
const CAT_COLOR = "#888888";

// Rainbow band colors (top to bottom)
const RAINBOW_COLORS = [
  "#ff0000", // red
  "#ff8800", // orange
  "#ffff00", // yellow
  "#33ff33", // green
  "#0088ff", // blue
  "#8833ff", // violet
];

// Star characters
const STAR_CHARS = [".", "*", "+", "·"];
const STAR_COLOR = "#ffffff";

interface Star {
  x: number;
  y: number;
  speed: number;
  char: string;
  brightness: string;
}

interface State {
  stars: Star[];
  initialized: boolean;
  scroll: number;
}

function spawnStar(columns: number, rows: number, offscreen: boolean): Star {
  const brightnesses = ["#ffffff", "#aaaaaa", "#666666"];
  return {
    x: offscreen
      ? columns + Math.floor(Math.random() * 20)
      : Math.floor(Math.random() * columns),
    y: Math.floor(Math.random() * rows),
    speed: 0.3 + Math.random() * 0.7,
    char: STAR_CHARS[Math.floor(Math.random() * STAR_CHARS.length)],
    brightness: brightnesses[Math.floor(Math.random() * brightnesses.length)],
  };
}

const NyanCat: React.FC<ScreensaverProps> = ({ columns, rows, frame }) => {
  const contentRows = rows - 1;
  const stateRef = useRef<State>({
    stars: [],
    initialized: false,
    scroll: 0,
  });

  const state = stateRef.current;

  // Initialize stars
  if (!state.initialized) {
    state.initialized = true;
    const starCount = Math.max(
      10,
      Math.floor((columns * contentRows) / 80),
    );
    for (let i = 0; i < starCount; i++) {
      state.stars.push(spawnStar(columns, contentRows, false));
    }
  }

  // Update scroll
  state.scroll += 1;

  // Update stars — move them left
  for (const star of state.stars) {
    star.x -= star.speed;
  }

  // Respawn off-screen stars
  let write = 0;
  for (let read = 0; read < state.stars.length; read++) {
    if (state.stars[read].x > -2) {
      state.stars[write++] = state.stars[read];
    }
  }
  state.stars.length = write;

  const targetStars = Math.max(
    10,
    Math.floor((columns * contentRows) / 80),
  );
  while (state.stars.length < targetStars) {
    state.stars.push(spawnStar(columns, contentRows, true));
  }

  // Cat position — centered horizontally with bob
  const catX = Math.floor(columns * 0.55);
  const bobY = Math.sin(frame * 0.3) * 1.5;
  const catY = Math.floor(contentRows / 2 - CAT_HEIGHT / 2 + bobY);

  // Select animation frame (cycle through leg frames)
  const catFrame = CAT_FRAMES[Math.floor(frame / 3) % CAT_FRAMES.length];

  // Rainbow trail parameters
  const rainbowBandHeight = Math.max(
    1,
    Math.floor((CAT_HEIGHT - 2) / RAINBOW_COLORS.length),
  );
  const rainbowTop = catY + 1; // start just below top of cat
  const rainbowLength = catX; // trail extends to the left edge
  const totalRainbowRows = RAINBOW_COLORS.length * rainbowBandHeight;

  // Build grid
  const grid: (SparseCell | null)[][] = Array.from(
    { length: contentRows },
    () => new Array(columns).fill(null),
  );

  // Place stars
  for (const star of state.stars) {
    const sx = Math.floor(star.x);
    const sy = Math.floor(star.y);
    if (sx >= 0 && sx < columns && sy >= 0 && sy < contentRows) {
      grid[sy][sx] = { char: star.char, color: star.brightness };
    }
  }

  // Place rainbow trail — wavy bands
  for (let bandIdx = 0; bandIdx < RAINBOW_COLORS.length; bandIdx++) {
    const color = RAINBOW_COLORS[bandIdx];
    for (let bh = 0; bh < rainbowBandHeight; bh++) {
      const gy = rainbowTop + bandIdx * rainbowBandHeight + bh;
      if (gy < 0 || gy >= contentRows) continue;
      for (let x = 0; x < rainbowLength; x++) {
        // Wave effect — offset based on x position and frame
        const wave = Math.sin((x + state.scroll) * 0.3) * 0.8;
        const wy = Math.floor(gy + wave);
        if (wy >= 0 && wy < contentRows && x >= 0 && x < columns) {
          grid[wy][x] = { char: "█", color };
        }
      }
    }
  }

  // Place cat sprite
  for (let row = 0; row < catFrame.length; row++) {
    const gy = catY + row;
    if (gy < 0 || gy >= contentRows) continue;
    const chars = [...catFrame[row]];
    for (let col = 0; col < chars.length; col++) {
      const gx = catX + col;
      if (gx < 0 || gx >= columns) continue;
      const ch = chars[col];
      if (ch !== " ") {
        // Color the body vs face features differently
        const isPoptartBody = ch === "|" || ch === "-" || ch === "'" || ch === "," || ch === "(" || ch === ")";
        const isCatFeature = ch === "◕" || ch === "─" || ch === "/" || ch === "\\";
        const color = isCatFeature
          ? CAT_COLOR
          : isPoptartBody
            ? POPTART_COLOR
            : POPTART_COLOR;
        grid[gy][gx] = { char: ch, color };
      }
    }
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
};

export const nyanCat: ScreensaverModule = {
  name: "nyan-cat",
  description: "Pop-tart cat flying through space with a rainbow trail",
  component: NyanCat,
  fps: 15,
};
