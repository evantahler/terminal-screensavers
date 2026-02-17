import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

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

  // Update position
  s.x += s.dx;
  s.y += s.dy;

  // Bounce horizontally
  if (s.x <= 0 || s.x + CLOCK_WIDTH >= columns) {
    s.dx *= -1;
    s.x = Math.max(0, Math.min(s.x, columns - CLOCK_WIDTH));
    s.colorIdx = (s.colorIdx + 1) % COLORS.length;
  }

  // Bounce vertically
  if (s.y <= 0 || s.y + CLOCK_HEIGHT >= rows - 1) {
    s.dy *= -1;
    s.y = Math.max(0, Math.min(s.y, rows - 1 - CLOCK_HEIGHT));
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

  // Render the screen
  const screen: string[] = Array(rows - 1).fill("");
  for (let row = 0; row < rows - 1; row++) {
    if (row >= s.y && row < s.y + CLOCK_HEIGHT) {
      const clockRow = clockLines[row - s.y];
      screen[row] =
        " ".repeat(s.x) +
        clockRow +
        " ".repeat(Math.max(0, columns - s.x - clockRow.length));
    } else {
      screen[row] = " ".repeat(columns);
    }
  }

  const color = COLORS[s.colorIdx];

  return (
    <Box flexDirection="column">
      {screen.map((line, idx) => (
        <Box key={idx}>
          <Text color={color}>{line}</Text>
        </Box>
      ))}
    </Box>
  );
};

export const digitalClock: ScreensaverModule = {
  name: "digital-clock",
  description: "Large bouncing digital clock display",
  component: DigitalClock,
  fps: 10,
};
