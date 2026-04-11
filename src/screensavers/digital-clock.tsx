import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, bounce, renderSparseRow } from "./utils.js";

const DIGITS: Record<string, string[]> = {
  "0": ["█████", "█   █", "█   █", "█   █", "█████"],
  "1": ["  █  ", "  █  ", "  █  ", "  █  ", "  █  "],
  "2": ["█████", "    █", "█████", "█    ", "█████"],
  "3": ["█████", "    █", "█████", "    █", "█████"],
  "4": ["█   █", "█   █", "█████", "    █", "    █"],
  "5": ["█████", "█    ", "█████", "    █", "█████"],
  "6": ["█████", "█    ", "█████", "█   █", "█████"],
  "7": ["█████", "    █", "    █", "    █", "    █"],
  "8": ["█████", "█   █", "█████", "█   █", "█████"],
  "9": ["█████", "█   █", "█████", "    █", "█████"],
  ":": ["     ", "  █  ", "     ", "  █  ", "     "],
};

const COLORS = ["cyan", "green", "magenta", "yellow", "red", "blue", "white"];
const CLOCK_WIDTH = 47;
const CLOCK_HEIGHT = 5;

const DigitalClock: React.FC<ScreensaverProps> = ({ columns, rows }) => {
  const state = useRef({
    x: Math.floor(Math.random() * (columns - CLOCK_WIDTH)),
    y: Math.floor(Math.random() * (rows - 1 - CLOCK_HEIGHT)),
    dx: 1,
    dy: 1,
    colorIdx: 0,
  });

  const s = state.current;

  const bx = bounce(s.x, s.dx, columns - CLOCK_WIDTH);
  const by = bounce(s.y, s.dy, rows - 1 - CLOCK_HEIGHT);
  s.x = bx.pos;
  s.dx = bx.vel;
  s.y = by.pos;
  s.dy = by.vel;

  if (bx.bounced || by.bounced) {
    s.colorIdx = (s.colorIdx + 1) % COLORS.length;
  }

  // Get current time
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const timeString = `${hours}:${minutes}:${seconds}`;

  // Build the clock display
  const clockLines: string[] = Array(CLOCK_HEIGHT).fill("");

  for (let row = 0; row < CLOCK_HEIGHT; row++) {
    let line = "";
    for (let i = 0; i < timeString.length; i++) {
      const char = timeString[i];
      const digitLines = DIGITS[char] || [
        "     ",
        "     ",
        "     ",
        "     ",
        "     ",
      ];
      line += digitLines[row];
      if (i < timeString.length - 1) {
        line += " "; // gap between characters
      }
    }
    clockLines[row] = line;
  }

  const color = COLORS[s.colorIdx];

  // Render the screen
  const screen: React.ReactNode[] = [];
  for (let row = 0; row < rows - 1; row++) {
    if (row >= s.y && row < s.y + CLOCK_HEIGHT) {
      const clockRow = clockLines[row - s.y];
      const sparseRow: (SparseCell | null)[] = new Array(columns).fill(null);
      const startX = Math.max(0, Math.round(s.x));
      for (let i = 0; i < clockRow.length; i++) {
        const x = startX + i;
        if (x >= 0 && x < columns && clockRow[i] !== " ") {
          sparseRow[x] = { char: clockRow[i], color };
        }
      }
      screen.push(renderSparseRow(sparseRow, row));
    } else {
      screen.push(renderSparseRow([], row));
    }
  }

  return <Box flexDirection="column">{screen}</Box>;
};

export const digitalClock: ScreensaverModule = {
  name: "digital-clock",
  description: "Large bouncing digital clock display",
  component: DigitalClock,
  fps: 10,
};
