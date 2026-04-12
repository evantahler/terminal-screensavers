import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

// Luminance characters from dark to bright
const LUMINANCE = ".,-~:;=!*#$@";

// Color palette based on surface normal angle (warm tones for the donut)
const COLORS = [
  "#ff6600",
  "#ff8833",
  "#ffaa44",
  "#ffcc66",
  "#ffdd88",
  "#ffffff",
  "#ffdd88",
  "#ffcc66",
  "#ffaa44",
  "#ff8833",
  "#ff6600",
  "#cc4400",
];

interface DonutState {
  a: number; // rotation around X axis
  b: number; // rotation around Z axis
  zBuffer: Float64Array;
  output: (SparseCell | null)[];
  prevCols: number;
  prevRows: number;
}

const AsciiDonut: React.FC<ScreensaverProps> = ({ columns, rows }) => {
  const height = rows - 1;
  const stateRef = useRef<DonutState | null>(null);

  if (
    !stateRef.current ||
    stateRef.current.prevCols !== columns ||
    stateRef.current.prevRows !== height
  ) {
    stateRef.current = {
      a: 0,
      b: 0,
      zBuffer: new Float64Array(columns * height),
      output: new Array(columns * height).fill(null),
      prevCols: columns,
      prevRows: height,
    };
  }

  const state = stateRef.current;

  // Advance rotation
  state.a += 0.07;
  state.b += 0.03;

  const sinA = Math.sin(state.a);
  const cosA = Math.cos(state.a);
  const sinB = Math.sin(state.b);
  const cosB = Math.cos(state.b);

  // Clear buffers
  state.zBuffer.fill(0);
  state.output.fill(null);

  // Torus parameters - scale to fit the terminal
  const scale = Math.min(columns * 0.5, height) * 0.4;
  const R1 = 1; // tube radius
  const R2 = 2; // distance from center to tube center
  const K2 = 5; // distance from viewer
  const K1 = scale * K2 * 3 * (1 / (8 * (R1 + R2)));

  const cx = Math.floor(columns / 2);
  const cy = Math.floor(height / 2);

  // Sample the torus surface
  const thetaStep = 0.07;
  const phiStep = 0.02;

  for (let theta = 0; theta < 6.28; theta += thetaStep) {
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let phi = 0; phi < 6.28; phi += phiStep) {
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      // Circle point on the torus
      const circleX = R2 + R1 * cosTheta;
      const circleY = R1 * sinTheta;

      // 3D coordinates after rotation
      const x =
        circleX * (cosB * cosPhi + sinA * sinB * sinPhi) -
        circleY * cosA * sinB;
      const y =
        circleX * (sinB * cosPhi - sinA * cosB * sinPhi) +
        circleY * cosA * cosB;
      const z = K2 + cosA * circleX * sinPhi + circleY * sinA;
      const ooz = 1 / z; // one over z

      // Project to 2D - apply aspect ratio correction (chars are ~2x tall)
      const xp = Math.floor(cx + K1 * ooz * x * 2);
      const yp = Math.floor(cy - K1 * ooz * y);

      if (xp < 0 || xp >= columns || yp < 0 || yp >= height) continue;

      const idx = yp * columns + xp;

      // Only draw if this point is closer than what's already there
      if (ooz > state.zBuffer[idx]) {
        state.zBuffer[idx] = ooz;

        // Compute luminance from surface normal
        const L =
          cosPhi * cosTheta * sinB -
          cosA * cosTheta * sinPhi -
          sinA * sinTheta +
          cosB * (cosA * sinTheta - cosTheta * sinA * sinPhi);

        // Skip back-facing surfaces (negative luminance)
        if (L <= 0) continue;

        const luminanceIdx = Math.min(LUMINANCE.length - 1, Math.floor(L * 8));
        const colorIdx = Math.floor(
          ((phi / 6.28) * COLORS.length) % COLORS.length,
        );

        state.output[idx] = {
          char: LUMINANCE[luminanceIdx],
          color: COLORS[colorIdx],
        };
      }
    }
  }

  // Build sparse rows
  const rowElements: React.ReactNode[] = [];
  for (let y = 0; y < height; y++) {
    const row: (SparseCell | null)[] = [];
    const offset = y * columns;
    for (let x = 0; x < columns; x++) {
      row.push(state.output[offset + x]);
    }
    rowElements.push(renderSparseRow(row, y));
  }

  return <Box flexDirection="column">{rowElements}</Box>;
};

export const asciiDonut: ScreensaverModule = {
  name: "ascii-donut",
  description: "The famous rotating 3D donut rendered in ASCII",
  component: AsciiDonut,
  fps: 20,
};
