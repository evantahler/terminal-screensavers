import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

interface Star {
  x: number;
  y: number;
  char: string;
  brightness: number;
}

interface Curtain {
  centerX: number;
  hue: number;
  phase: number;
  amplitude: number;
  speed: number;
  width: number;
  fadePhase: number;
  fadeSpeed: number;
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color)))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function AuroraBorealis({
  columns,
  rows,
  elapsed,
}: ScreensaverProps): React.ReactElement {
  const starsRef = useRef<Star[]>([]);
  const curtainsRef = useRef<Curtain[]>([]);
  const starMapRef = useRef<Map<string, Star>>(new Map());

  const height = rows - 1;

  // Initialize stars
  if (starsRef.current.length === 0) {
    for (let i = 0; i < 80; i++) {
      const star: Star = {
        x: Math.floor(Math.random() * columns),
        y: Math.floor(Math.random() * height),
        char: Math.random() > 0.6 ? "*" : ".",
        brightness: 0.3 + Math.random() * 0.7,
      };
      starsRef.current.push(star);
      if (star.x < columns && star.y < height) {
        starMapRef.current.set(`${star.x},${star.y}`, star);
      }
    }
  }

  // Initialize curtains
  if (curtainsRef.current.length === 0) {
    const hues = [120, 160, 200, 270, 320, 140];
    for (let i = 0; i < 6; i++) {
      curtainsRef.current.push({
        centerX: (columns / 7) * (i + 1),
        hue: hues[i],
        phase: (Math.PI * 2 * i) / 6,
        amplitude: columns * 0.08 + Math.random() * columns * 0.05,
        speed: 0.0003 + Math.random() * 0.0004,
        width: 3 + Math.random() * 3,
        fadePhase: Math.random() * Math.PI * 2,
        fadeSpeed: 0.0001 + Math.random() * 0.0002,
      });
    }
  }

  const starMap = starMapRef.current;

  // Aurora reaches down to ~55% of screen height
  const auroraMaxRow = Math.floor(height * 0.55);

  // Build output
  const lines: React.ReactNode[] = [];

  for (let y = 0; y < height; y++) {
    const row: (SparseCell | null)[] = new Array(columns).fill(null);

    for (let x = 0; x < columns; x++) {
      let maxIntensity = 0;
      let bestHue = 0;

      if (y < auroraMaxRow) {
        const verticalFade = 1 - y / auroraMaxRow;
        const verticalShape = verticalFade * verticalFade;

        for (const curtain of curtainsRef.current) {
          const swayX =
            curtain.centerX +
            Math.sin(elapsed * curtain.speed + curtain.phase) *
              curtain.amplitude;

          const ripple =
            Math.sin(y * 0.3 + elapsed * 0.002 + curtain.phase) * 2;
          const effectiveX = swayX + ripple;

          const dx = x - effectiveX;
          const spread = curtain.width;
          const horizontalIntensity = Math.exp(
            -(dx * dx) / (2 * spread * spread),
          );

          const fadeFactor =
            0.5 +
            0.5 * Math.sin(elapsed * curtain.fadeSpeed + curtain.fadePhase);

          const intensity = horizontalIntensity * verticalShape * fadeFactor;

          if (intensity > maxIntensity) {
            maxIntensity = intensity;
            bestHue = curtain.hue + y * 0.5;
          }
        }
      }

      if (maxIntensity > 0.05) {
        const saturation = 0.7 + maxIntensity * 0.3;
        const lightness = 0.2 + maxIntensity * 0.5;
        const color = hslToHex(bestHue % 360, saturation, lightness);

        let char: string;
        if (maxIntensity > 0.7) char = "█";
        else if (maxIntensity > 0.5) char = "▓";
        else if (maxIntensity > 0.3) char = "▒";
        else if (maxIntensity > 0.15) char = "░";
        else char = "·";

        row[x] = { char, color };
      } else {
        const star = starMap.get(`${x},${y}`);
        if (star) {
          const twinkle =
            0.5 +
            0.5 * Math.sin(elapsed * 0.003 + star.x * 7.3 + star.y * 13.7);
          const brightness = Math.floor(80 + twinkle * star.brightness * 175);
          const hex = brightness.toString(16).padStart(2, "0");
          row[x] = { char: star.char, color: `#${hex}${hex}${hex}` };
        }
      }
    }

    lines.push(renderSparseRow(row, y));
  }

  return <Box flexDirection="column">{lines}</Box>;
}

export const auroraBorealis: ScreensaverModule = {
  name: "aurora-borealis",
  description: "Shimmering curtains of northern lights with twinkling stars",
  component: AuroraBorealis,
  fps: 12,
};
