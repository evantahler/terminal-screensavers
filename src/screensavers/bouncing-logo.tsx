import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, bounce, renderSparseRow } from "./utils.js";

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

  const bx = bounce(s.x, s.dx, maxX);
  const by = bounce(s.y, s.dy, maxY);
  s.x = bx.pos;
  s.dx = bx.vel;
  s.y = by.pos;
  s.dy = by.vel;

  if (bx.bounced || by.bounced) {
    s.colorIdx = (s.colorIdx + 1) % COLORS.length;
  }

  const color = COLORS[s.colorIdx];

  // Build the screen
  const lines: React.ReactNode[] = [];

  for (let y = 0; y < rows - 1; y++) {
    const logoLineIdx = y - s.y;
    if (logoLineIdx >= 0 && logoLineIdx < LOGO_HEIGHT) {
      const sparseRow: (SparseCell | null)[] = new Array(columns).fill(null);
      const logoLine = LOGO[logoLineIdx];
      const startX = Math.max(0, Math.round(s.x));
      for (let i = 0; i < logoLine.length; i++) {
        const x = startX + i;
        if (x < columns) {
          sparseRow[x] = { char: logoLine[i], color, bold: true };
        }
      }
      lines.push(renderSparseRow(sparseRow, y));
    } else {
      lines.push(renderSparseRow([], y));
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
