import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

const KATAKANA =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CHARS = KATAKANA + LATIN;

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

interface Drop {
  y: number;
  speed: number;
  length: number;
  chars: string[];
}

function MatrixRain({ columns, rows }: ScreensaverProps) {
  const dropsRef = useRef<Map<number, Drop>>(new Map());
  const drops = dropsRef.current;

  // Initialize or advance drops
  for (let x = 0; x < columns; x++) {
    const drop = drops.get(x);
    if (!drop || drop.y - drop.length > rows) {
      if (!drop || Math.random() < 0.02) {
        drops.set(x, {
          y: -Math.floor(Math.random() * rows),
          speed: 0.3 + Math.random() * 0.7,
          length: 5 + Math.floor(Math.random() * 20),
          chars: Array.from({ length: rows + 30 }, () => randomChar()),
        });
      }
    }
  }

  // Build the grid
  const lines: React.ReactNode[] = [];

  for (let y = 0; y < rows - 1; y++) {
    const chars: React.ReactNode[] = [];
    for (let x = 0; x < columns; x++) {
      const drop = drops.get(x);
      if (!drop) {
        chars.push(<Text key={x}> </Text>);
        continue;
      }

      const headY = Math.floor(drop.y);
      const dist = headY - y;

      if (dist < 0 || dist >= drop.length) {
        chars.push(<Text key={x}> </Text>);
      } else if (dist === 0) {
        chars.push(
          <Text key={x} color="white" bold>
            {drop.chars[y % drop.chars.length]}
          </Text>,
        );
      } else if (dist < 3) {
        chars.push(
          <Text key={x} color="#00ff00">
            {drop.chars[y % drop.chars.length]}
          </Text>,
        );
      } else {
        const brightness = Math.max(0, 1 - dist / drop.length);
        const green = Math.floor(80 + brightness * 175);
        chars.push(
          <Text key={x} color={`#00${green.toString(16).padStart(2, "0")}00`}>
            {drop.chars[y % drop.chars.length]}
          </Text>,
        );
      }
    }
    lines.push(<Box key={y}>{chars}</Box>);
  }

  // Advance drops
  for (const [, drop] of drops) {
    drop.y += drop.speed;
    if (Math.random() < 0.1) {
      const idx = Math.floor(Math.random() * drop.chars.length);
      drop.chars[idx] = randomChar();
    }
  }

  return <Box flexDirection="column">{lines}</Box>;
}

export const matrixRain: ScreensaverModule = {
  name: "matrix-rain",
  description: "Falling green katakana and latin characters",
  component: MatrixRain,
  fps: 12,
};
