import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

// Sprite defined as a grid of color codes per character
// ' ' = transparent, letters map to colors
// g = grey (cat body), p = pink (frosting), t = tan (crust)
// s = sprinkle, w = white (eyes), k = black (pupils), m = mouth

// Each frame is [charRow, colorRow] pairs
// The cat faces right: tail on left, poptart center, head right

const SPRITE_CHARS_1 = [
  "                  ▄▄  ▄▄  ",
  "  ┌────────────┐ █  ▀▀  █ ",
  "  │▒▒•▒▒▒•▒▒▒▒│ █ ●  ● █ ",
  "──│▒▒▒▒•▒▒•▒▒▒│ █  ▽   █ ",
  "  │▒•▒▒▒▒▒•▒▒▒│ █▄    ▄█ ",
  "  └────────────┘   ▀▀▀▀   ",
  "    ██  ██    ██    ▀▀    ",
];

const SPRITE_CHARS_2 = [
  "                  ▄▄  ▄▄  ",
  "  ┌────────────┐ █  ▀▀  █ ",
  "  │▒▒•▒▒▒•▒▒▒▒│ █ ●  ● █ ",
  "──│▒▒▒▒•▒▒•▒▒▒│ █  ▽   █ ",
  "  │▒•▒▒▒▒▒•▒▒▒│ █▄    ▄█ ",
  "  └────────────┘   ▀▀▀▀   ",
  "     ██ ██ ██     ▀▀     ",
];

const SPRITE_CHARS_3 = [
  "                  ▄▄  ▄▄  ",
  "  ┌────────────┐ █  ▀▀  █ ",
  "  │▒▒•▒▒▒•▒▒▒▒│ █ ●  ● █ ",
  "══│▒▒▒▒•▒▒•▒▒▒│ █  ▽   █ ",
  "  │▒•▒▒▒▒▒•▒▒▒│ █▄    ▄█ ",
  "  └────────────┘   ▀▀▀▀   ",
  "   ██  ██    ██   ▀▀     ",
];

const SPRITE_FRAMES = [
  SPRITE_CHARS_1,
  SPRITE_CHARS_2,
  SPRITE_CHARS_3,
  SPRITE_CHARS_2,
];

// Color map: same dimensions as sprite chars, maps each char to a color
// Uses single-char codes: g=grey, p=pink, t=tan, s=sprinkle, w=white, k=black
const COLOR_MAP = [
  "                  gg  gg  ",
  "  tttttttttttttt gg  gg  g ",
  "  tppspppspppptg gw  w gg ",
  "ggtppppsppspppttg gm   gg ",
  "  tpspppppspppttg g    gg ",
  "  tttttttttttttt   gggg   ",
  "    gg  gg    gg    gg    ",
];

const COLORS: Record<string, string> = {
  g: "#999999", // grey cat
  p: "#ff88aa", // pink frosting
  t: "#ddaa66", // tan crust
  s: "#ff4488", // sprinkle pink
  w: "#ffffff", // white eyes
  k: "#222222", // black pupils
  m: "#ffffff", // mouth
};

// Sprinkle colors cycle
const SPRINKLE_COLORS = ["#ff4488", "#44ddff", "#ffff44", "#ff8844", "#88ff44"];

const SPRITE_HEIGHT = SPRITE_CHARS_1.length;
const SPRITE_WIDTH = Math.max(...SPRITE_CHARS_1.map((r) => [...r].length));

// Rainbow band colors (top to bottom)
const RAINBOW_COLORS = [
  "#ff0000", // red
  "#ff8800", // orange
  "#ffff00", // yellow
  "#33ff33", // green
  "#0088ff", // blue
  "#8833ff", // violet
];

// Star characters and brightness levels
const STAR_CHARS = [".", "✦", "+", "·", "✧"];

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
  sprinkleOffset: number;
}

function spawnStar(columns: number, rows: number, offscreen: boolean): Star {
  const brightnesses = ["#ffffff", "#bbbbbb", "#777777", "#555555"];
  return {
    x: offscreen
      ? columns + Math.floor(Math.random() * 30)
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
    sprinkleOffset: 0,
  });

  const state = stateRef.current;

  // Initialize stars
  if (!state.initialized) {
    state.initialized = true;
    const starCount = Math.max(15, Math.floor((columns * contentRows) / 60));
    for (let i = 0; i < starCount; i++) {
      state.stars.push(spawnStar(columns, contentRows, false));
    }
  }

  state.scroll += 1;
  state.sprinkleOffset = Math.floor(frame / 8) % SPRINKLE_COLORS.length;

  // Update stars — move them left
  for (const star of state.stars) {
    star.x -= star.speed;
  }

  // Respawn off-screen stars (in-place compaction)
  let write = 0;
  for (let read = 0; read < state.stars.length; read++) {
    if (state.stars[read].x > -2) {
      state.stars[write++] = state.stars[read];
    }
  }
  state.stars.length = write;

  const targetStars = Math.max(15, Math.floor((columns * contentRows) / 60));
  while (state.stars.length < targetStars) {
    state.stars.push(spawnStar(columns, contentRows, true));
  }

  // Cat position — centered with bob
  const catX = Math.floor(columns * 0.5 - SPRITE_WIDTH / 2 + 4);
  const bobY = Math.sin(frame * 0.25) * 1.5;
  const catY = Math.floor(contentRows / 2 - SPRITE_HEIGHT / 2 + bobY);

  // Select animation frame
  const spriteFrame =
    SPRITE_FRAMES[Math.floor(frame / 4) % SPRITE_FRAMES.length];

  // Rainbow trail parameters
  const rainbowBandHeight = 1;
  const rainbowTop = catY + 1;
  const rainbowLength = catX + 2; // trail extends to left edge

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
    const gy = rainbowTop + bandIdx * rainbowBandHeight;
    if (gy < 0 || gy >= contentRows) continue;
    for (let x = 0; x < rainbowLength; x++) {
      // Wave effect
      const wave = Math.sin((x + state.scroll) * 0.25) * 1.2;
      const wy = Math.floor(gy + wave);
      if (wy >= 0 && wy < contentRows && x >= 0 && x < columns) {
        grid[wy][x] = { char: "█", color };
      }
    }
  }

  // Place cat sprite with per-character coloring
  let sprinkleIdx = 0;
  for (let row = 0; row < spriteFrame.length; row++) {
    const gy = catY + row;
    if (gy < 0 || gy >= contentRows) continue;
    const chars = [...spriteFrame[row]];
    const colorCodes = COLOR_MAP[row] ? [...COLOR_MAP[row]] : [];

    for (let col = 0; col < chars.length; col++) {
      const gx = catX + col;
      if (gx < 0 || gx >= columns) continue;
      const ch = chars[col];
      if (ch === " ") continue;

      const colorCode = colorCodes[col] || "g";
      let color: string;

      if (ch === "•") {
        // Sprinkles get cycling colors
        color =
          SPRINKLE_COLORS[
            (sprinkleIdx + state.sprinkleOffset) % SPRINKLE_COLORS.length
          ];
        sprinkleIdx++;
      } else if (ch === "●") {
        color = "#ffffff";
      } else if (ch === "▽") {
        color = "#ffaaaa";
      } else {
        color = COLORS[colorCode] || COLORS.g;
      }

      grid[gy][gx] = { char: ch, color };
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
