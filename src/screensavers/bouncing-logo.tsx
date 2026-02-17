import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

const LOGO = [
  "╔════════════════════╗",
  "║  TERMINAL          ║",
  "║     SCREENSAVERS   ║",
  "╚════════════════════╝",
];

const COLORS = [
  "#ff0000",
  "#ff8800",
  "#ffff00",
  "#00ff00",
  "#0088ff",
  "#8800ff",
  "#ff00ff",
  "#00ffff",
];

const LOGO_WIDTH = LOGO[0].length;
const LOGO_HEIGHT = LOGO.length;

function BouncingLogo({ columns, rows }: ScreensaverProps) {
  const stateRef = useRef({
    x: Math.floor(Math.random() * Math.max(1, columns - LOGO_WIDTH)),
    y: Math.floor(Math.random() * Math.max(1, rows - 1 - LOGO_HEIGHT)),
    dx: Math.random() < 0.5 ? 1 : -1,
    dy: Math.random() < 0.5 ? 1 : -1,
    colorIdx: 0,
  });

  const s = stateRef.current;
  const maxX = columns - LOGO_WIDTH;
  const maxY = rows - 1 - LOGO_HEIGHT;

  // Move
  s.x += s.dx;
  s.y += s.dy;

  let bounced = false;

  if (s.x <= 0) {
    s.x = 0;
    s.dx = 1;
    bounced = true;
  } else if (s.x >= maxX) {
    s.x = maxX;
    s.dx = -1;
    bounced = true;
  }

  if (s.y <= 0) {
    s.y = 0;
    s.dy = 1;
    bounced = true;
  } else if (s.y >= maxY) {
    s.y = maxY;
    s.dy = -1;
    bounced = true;
  }

  if (bounced) {
    s.colorIdx = (s.colorIdx + 1) % COLORS.length;
  }

  const color = COLORS[s.colorIdx];

  // Build the screen
  const lines: React.ReactNode[] = [];

  for (let y = 0; y < rows - 1; y++) {
    const logoLineIdx = y - s.y;
    if (logoLineIdx >= 0 && logoLineIdx < LOGO_HEIGHT) {
      const padding = " ".repeat(Math.max(0, s.x));
      lines.push(
        <Box key={y}>
          <Text>
            {padding}
            <Text color={color} bold>
              {LOGO[logoLineIdx]}
            </Text>
          </Text>
        </Box>,
      );
    } else {
      lines.push(
        <Box key={y}>
          <Text> </Text>
        </Box>,
      );
    }
  }

  return <Box flexDirection="column">{lines}</Box>;
}

export const bouncingLogo: ScreensaverModule = {
  name: "bouncing-logo",
  description: "DVD-style bouncing text block with color changes",
  component: BouncingLogo,
  fps: 15,
};
