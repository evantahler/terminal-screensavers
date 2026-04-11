import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

const DNAHelix: React.FC<ScreensaverProps> = ({ columns, rows }) => {
  const state = useRef({ offset: 0 });

  // Update rotation offset
  state.current.offset += 0.15;

  const centerX = Math.floor(columns / 2);
  const amplitude = columns * 0.15;
  const height = rows - 1;

  // Base pairs cycle: A-T, G-C
  const basePairs = [
    { pair: "A-T", color1: "#ff0000", color2: "#00ff00" },
    { pair: "G-C", color1: "#00ffff", color2: "#ffff00" },
  ];

  const output: React.ReactNode[] = [];

  for (let y = 0; y < height; y++) {
    const angle = y * 0.3 + state.current.offset;
    const strand1X = Math.round(centerX + Math.sin(angle) * amplitude);
    const strand2X = Math.round(
      centerX + Math.sin(angle + Math.PI) * amplitude,
    );

    // Determine which strand is in front
    const strand1InFront = Math.cos(angle) > 0;

    // Determine base pair type
    const basePairIndex = Math.floor((y + state.current.offset * 2) / 4) % 2;
    const basePair = basePairs[basePairIndex];

    // Sort positions to draw back strand first
    const positions = [
      {
        x: strand1X,
        char: strand1InFront ? "●" : "○",
        color: strand1InFront ? "#00ccff" : "#006688",
        bold: strand1InFront,
        isStrand1: true,
        inFront: strand1InFront,
      },
      {
        x: strand2X,
        char: strand1InFront ? "○" : "●",
        color: strand1InFront ? "#883300" : "#ff6600",
        bold: !strand1InFront,
        isStrand1: false,
        inFront: !strand1InFront,
      },
    ].sort((a, b) => {
      // Draw back strand first
      if (a.inFront === b.inFront) return 0;
      return a.inFront ? 1 : -1;
    });

    // Draw base pairs between strands
    const minX = Math.min(strand1X, strand2X);
    const maxX = Math.max(strand1X, strand2X);
    const distance = maxX - minX;

    const row: (SparseCell | null)[] = new Array(columns).fill(null);

    for (let x = 0; x < columns; x++) {
      if (x === strand1X) {
        const pos = positions.find((p) => p.isStrand1);
        if (pos) {
          row[x] = { char: pos.char, color: pos.color, bold: pos.bold };
        }
      } else if (x === strand2X) {
        const pos = positions.find((p) => !p.isStrand1);
        if (pos) {
          row[x] = { char: pos.char, color: pos.color, bold: pos.bold };
        }
      } else if (x > minX && x < maxX && distance < amplitude * 1.5) {
        const progress = (x - minX) / distance;
        const color = progress < 0.5 ? basePair.color1 : basePair.color2;
        row[x] = { char: "-", color };
      }
    }

    output.push(renderSparseRow(row, y));
  }

  return <Box flexDirection="column">{output}</Box>;
};

export const dnaHelix: ScreensaverModule = {
  name: "dna-helix",
  description: "Rotating DNA double helix animation",
  component: DNAHelix,
  fps: 12,
};
