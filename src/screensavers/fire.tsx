import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

const Fire: React.FC<ScreensaverProps> = ({ columns, rows }) => {
  const heatBuffer = useRef<number[][]>([]);

  // Initialize heat buffer if needed
  if (heatBuffer.current.length === 0) {
    heatBuffer.current = Array.from({ length: rows - 1 }, () =>
      Array(columns).fill(0),
    );
  }

  // Ensure buffer matches current terminal size
  if (
    heatBuffer.current.length !== rows - 1 ||
    heatBuffer.current[0]?.length !== columns
  ) {
    heatBuffer.current = Array.from({ length: rows - 1 }, () =>
      Array(columns).fill(0),
    );
  }

  const buffer = heatBuffer.current;
  const height = rows - 1;

  // Update heat buffer
  // Add random heat to bottom row
  for (let x = 0; x < columns; x++) {
    buffer[height - 1][x] = 200 + Math.floor(Math.random() * 56);
  }

  // Propagate heat upward
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < columns; x++) {
      const below = buffer[y + 1]?.[x] ?? 0;
      const belowLeft = buffer[y + 1]?.[x - 1] ?? 0;
      const belowRight = buffer[y + 1]?.[x + 1] ?? 0;
      const twoBelow = buffer[y + 2]?.[x] ?? 0;

      const average = (below + belowLeft + belowRight + twoBelow) / 4;
      const decay = Math.floor(Math.random() * 3) + 1;
      buffer[y][x] = Math.max(0, average - decay);
    }
  }

  // Map heat values to characters and colors
  const getCharAndColor = (heat: number): { char: string; color: string } => {
    if (heat > 200) return { char: "█", color: "#ff0000" };
    if (heat > 160) return { char: "▓", color: "#ff4400" };
    if (heat > 120) return { char: "▒", color: "#ff8800" };
    if (heat > 80) return { char: "░", color: "#ffaa00" };
    if (heat > 40) return { char: ".", color: "#ffcc00" };
    return { char: " ", color: "#000000" };
  };

  // Build output
  return (
    <Box flexDirection="column">
      {buffer.map((row, y) => (
        <Box key={y}>
          {row.map((heat, x) => {
            const { char, color } = getCharAndColor(heat);
            return (
              <Text key={x} color={color}>
                {char}
              </Text>
            );
          })}
        </Box>
      ))}
    </Box>
  );
};

export const fire: ScreensaverModule = {
  name: "fire",
  description: "ASCII fire rising from the bottom of the screen",
  component: Fire,
  fps: 15,
};
