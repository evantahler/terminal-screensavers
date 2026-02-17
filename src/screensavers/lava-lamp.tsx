import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

interface Blob {
  x: number;
  y: number;
  radius: number;
  vy: number;
  phase: number;
  color: string;
}

const COLORS = [
  "#ff0066",
  "#ff6600",
  "#ffcc00",
  "#00ff66",
  "#0066ff",
  "#cc00ff",
  "#ff0099",
  "#00ffcc",
];

function LavaLamp({
  columns,
  rows,
  frame,
}: ScreensaverProps): React.ReactElement {
  const blobsRef = useRef<Blob[]>([]);

  // Initialize blobs on first render
  if (blobsRef.current.length === 0) {
    const lampWidth = Math.floor(columns * 0.4);
    const lampCenterX = Math.floor(columns / 2);
    const lampLeft = lampCenterX - Math.floor(lampWidth / 2);
    const lampRight = lampCenterX + Math.floor(lampWidth / 2);

    for (let i = 0; i < 7; i++) {
      blobsRef.current.push({
        x: lampLeft + Math.random() * lampWidth,
        y: Math.random() * (rows - 1),
        radius: 2 + Math.random() * 3,
        vy: (Math.random() - 0.5) * 0.4,
        phase: Math.random() * Math.PI * 2,
        color: COLORS[i % COLORS.length],
      });
    }
  }

  // Update blobs
  const lampWidth = Math.floor(columns * 0.4);
  const lampCenterX = Math.floor(columns / 2);
  const lampLeft = lampCenterX - Math.floor(lampWidth / 2);
  const lampRight = lampCenterX + Math.floor(lampWidth / 2);

  for (const blob of blobsRef.current) {
    // Update vertical position
    blob.y += blob.vy;

    // Bounce at top and bottom
    if (blob.y <= 0) {
      blob.y = 0;
      blob.vy = Math.abs(blob.vy);
    } else if (blob.y >= rows - 1) {
      blob.y = rows - 1;
      blob.vy = -Math.abs(blob.vy);
    }

    // Horizontal wobble
    blob.x += Math.sin(blob.phase) * 0.3;
    blob.phase += 0.05;

    // Keep within lamp bounds
    if (blob.x < lampLeft) blob.x = lampLeft;
    if (blob.x > lampRight) blob.x = lampRight;
  }

  // Render grid
  const lines: React.ReactElement[] = [];

  for (let y = 0; y < rows - 1; y++) {
    const chars: React.ReactElement[] = [];

    for (let x = 0; x < columns; x++) {
      let totalContribution = 0;
      let dominantBlob: Blob | null = null;
      let dominantContribution = 0;

      // Compute metaball field
      for (const blob of blobsRef.current) {
        const dx = x - blob.x;
        const dy = y * 2 - blob.y * 2;
        const distSq = dx * dx + dy * dy;

        if (distSq < 0.01) continue; // Avoid division by zero

        const contribution = (blob.radius * blob.radius) / distSq;
        totalContribution += contribution;

        if (contribution > dominantContribution) {
          dominantContribution = contribution;
          dominantBlob = blob;
        }
      }

      // Render based on field strength
      if (totalContribution > 1.0 && dominantBlob) {
        chars.push(
          <Text key={x} color={dominantBlob.color}>
            █
          </Text>,
        );
      } else if (totalContribution > 0.6 && dominantBlob) {
        chars.push(
          <Text key={x} color={dominantBlob.color} dimColor>
            ░
          </Text>,
        );
      } else {
        chars.push(<Text key={x}> </Text>);
      }
    }

    lines.push(<Box key={y}>{chars}</Box>);
  }

  return <Box flexDirection="column">{lines}</Box>;
}

export const lavaLamp: ScreensaverModule = {
  name: "lava-lamp",
  description: "Colorful metaball lava lamp blobs",
  component: LavaLamp,
  fps: 10,
};
