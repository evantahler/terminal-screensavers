import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { renderSparseRow } from "./utils.js";

// Compact toaster with toast popping out the top — the most iconic element
// Double-line box chars give a chrome look, ╠─ is the lever
const TOASTER_WINGS_UP = [
  " \\  ││  / ",
  "  \\ ││ /  ",
  "  ╔═╧╧═╗  ",
  "  ║▒▒▒▒║  ",
  "  ║▒▒▒▒╠─ ",
  "  ╚════╝  ",
];

const TOASTER_WINGS_MID = [
  "    ││    ",
  "  ╔═╧╧═╗  ",
  "──║▒▒▒▒║──",
  "  ║▒▒▒▒╠─ ",
  "  ╚════╝  ",
  "          ",
];

const TOASTER_WINGS_DOWN = [
  "    ││    ",
  "  ╔═╧╧═╗  ",
  " /║▒▒▒▒║\\ ",
  "/ ║▒▒▒▒╠─\\",
  "  ╚════╝  ",
  "          ",
];

const WING_FRAMES = [
  TOASTER_WINGS_UP,
  TOASTER_WINGS_MID,
  TOASTER_WINGS_DOWN,
  TOASTER_WINGS_MID,
];

// Toast: a slice of bread — rounded top crust, flat bottom
const TOAST_SPRITE = [" .-~~-. ", " │░░░░│ ", " │░░░░│ ", " '────' "];

const TOASTER_COLORS = ["#c0c0c0", "#d4d4d4", "#a8a8a8", "#b0b0b0"];
const TOAST_COLOR = "#daa520";

interface Toaster {
  x: number;
  y: number;
  speed: number;
  wingFrame: number;
  wingSpeed: number;
  color: string;
  wobble: number;
  wobbleSpeed: number;
}

interface Toast {
  x: number;
  y: number;
  speed: number;
}

interface State {
  toasters: Toaster[];
  toasts: Toast[];
  initialized: boolean;
}

function spawnToaster(
  columns: number,
  rows: number,
  offscreen: boolean,
): Toaster {
  const spriteH = TOASTER_WINGS_UP.length;
  return {
    x: offscreen
      ? columns + Math.floor(Math.random() * 20)
      : Math.floor(Math.random() * columns),
    y: Math.floor(Math.random() * (rows - spriteH)),
    speed: 0.4 + Math.random() * 0.6,
    wingFrame: Math.floor(Math.random() * WING_FRAMES.length),
    wingSpeed: 3 + Math.floor(Math.random() * 3),
    color: TOASTER_COLORS[Math.floor(Math.random() * TOASTER_COLORS.length)],
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.05 + Math.random() * 0.05,
  };
}

function spawnToast(columns: number, rows: number, offscreen: boolean): Toast {
  const spriteH = TOAST_SPRITE.length;
  return {
    x: offscreen
      ? columns + Math.floor(Math.random() * 30)
      : Math.floor(Math.random() * columns),
    y: Math.floor(Math.random() * (rows - spriteH)),
    speed: 0.3 + Math.random() * 0.5,
  };
}

// Get the visual width of a sprite line (ASCII chars, not unicode byte length)
function spriteWidth(line: string): number {
  // Each character occupies one column in the terminal
  return [...line].length;
}

const FlyingToasters: React.FC<ScreensaverProps> = ({
  columns,
  rows,
  frame,
}) => {
  const stateRef = useRef<State>({
    toasters: [],
    toasts: [],
    initialized: false,
  });

  const contentRows = rows - 1;
  const state = stateRef.current;

  // Initialize
  if (!state.initialized) {
    state.initialized = true;
    const toasterCount = Math.max(3, Math.floor((columns * contentRows) / 600));
    const toastCount = Math.max(2, Math.floor(toasterCount * 0.7));

    for (let i = 0; i < toasterCount; i++) {
      state.toasters.push(spawnToaster(columns, contentRows, false));
    }
    for (let i = 0; i < toastCount; i++) {
      state.toasts.push(spawnToast(columns, contentRows, false));
    }
  }

  // Update toasters
  for (const t of state.toasters) {
    t.x -= t.speed;
    t.wobble += t.wobbleSpeed;
    t.y += Math.sin(t.wobble) * 0.15;

    // Advance wing animation
    if (frame % t.wingSpeed === 0) {
      t.wingFrame = (t.wingFrame + 1) % WING_FRAMES.length;
    }
  }

  // Update toasts
  for (const t of state.toasts) {
    t.x -= t.speed;
  }

  // Respawn off-screen entities
  const toasterW = spriteWidth(TOASTER_WINGS_UP[0]);
  state.toasters = state.toasters.filter((t) => t.x > -toasterW);
  const toastW = spriteWidth(TOAST_SPRITE[0]);
  state.toasts = state.toasts.filter((t) => t.x > -toastW);

  const targetToasters = Math.max(3, Math.floor((columns * contentRows) / 600));
  const targetToasts = Math.max(2, Math.floor(targetToasters * 0.7));

  while (state.toasters.length < targetToasters) {
    state.toasters.push(spawnToaster(columns, contentRows, true));
  }
  while (state.toasts.length < targetToasts) {
    state.toasts.push(spawnToast(columns, contentRows, true));
  }

  // Build grid
  const grid: Array<Array<{ char: string; color: string } | null>> = Array.from(
    { length: contentRows },
    () => Array(columns).fill(null),
  );

  // Place a sprite on the grid
  const placeSprite = (
    sprite: string[],
    sx: number,
    sy: number,
    color: string,
  ) => {
    for (let row = 0; row < sprite.length; row++) {
      const gy = Math.floor(sy) + row;
      if (gy < 0 || gy >= contentRows) continue;
      const chars = [...sprite[row]];
      for (let col = 0; col < chars.length; col++) {
        const gx = Math.floor(sx) + col;
        if (gx < 0 || gx >= columns) continue;
        const ch = chars[col];
        if (ch !== " ") {
          grid[gy][gx] = { char: ch, color };
        }
      }
    }
  };

  // Render toasts first (behind toasters)
  for (const t of state.toasts) {
    placeSprite(TOAST_SPRITE, t.x, t.y, TOAST_COLOR);
  }

  // Render toasters
  for (const t of state.toasters) {
    const sprite = WING_FRAMES[t.wingFrame];
    placeSprite(sprite, t.x, t.y, t.color);
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
};

export const flyingToasters: ScreensaverModule = {
  name: "flying-toasters",
  description:
    "Classic After Dark chrome toasters with flapping wings and toast",
  component: FlyingToasters,
  fps: 15,
};
