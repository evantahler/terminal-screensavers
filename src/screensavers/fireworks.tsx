import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { renderSparseRow } from "./utils.js";

interface Rocket {
  x: number;
  y: number;
  targetY: number;
  speed: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  char: string;
}

const COLORS = [
  "#ff0000",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#ff00ff",
  "#ff8800",
  "#ffffff",
];

const Fireworks: React.FC<ScreensaverProps> = ({
  columns,
  rows,
  frame,
  elapsed,
}) => {
  const rocketsRef = useRef<Rocket[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const initializedRef = useRef(false);

  // Seed initial rockets so the screen isn't blank on startup
  if (!initializedRef.current) {
    initializedRef.current = true;
    for (let i = 0; i < 3; i++) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const targetY = Math.floor(Math.random() * (rows * 0.4)) + 1;
      const startY = rows - 1;
      const progress = (i + 1) / 4;
      rocketsRef.current.push({
        x: Math.floor(Math.random() * columns),
        y: startY - (startY - targetY) * progress,
        targetY,
        speed: 0.5 + Math.random() * 0.5,
        color,
      });
    }
  }

  // Launch new rockets
  if (Math.random() < 0.08) {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    rocketsRef.current.push({
      x: Math.floor(Math.random() * columns),
      y: rows - 1,
      targetY: Math.floor(Math.random() * (rows * 0.4)) + 1,
      speed: 0.5 + Math.random() * 0.5,
      color,
    });
  }

  // Update rockets and check for explosions
  const newRockets: Rocket[] = [];
  for (const rocket of rocketsRef.current) {
    rocket.y -= rocket.speed;

    if (rocket.y <= rocket.targetY) {
      // Explode
      const particleCount = 20 + Math.floor(Math.random() * 11); // 20-30
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
        const speed = 0.5 + Math.random() * 1.5; // 0.5-2.0
        const maxLife = 15 + Math.floor(Math.random() * 11); // 15-25
        particlesRef.current.push({
          x: rocket.x,
          y: rocket.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: maxLife,
          maxLife,
          color: rocket.color,
          char: "★",
        });
      }
    } else {
      newRockets.push(rocket);
    }
  }
  rocketsRef.current = newRockets;

  // Update particles
  const newParticles: Particle[] = [];
  for (const particle of particlesRef.current) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.05; // Gravity
    particle.life -= 1;

    // Update character based on life ratio
    const lifeRatio = particle.life / particle.maxLife;
    if (lifeRatio > 0.75) {
      particle.char = "★";
    } else if (lifeRatio > 0.5) {
      particle.char = "*";
    } else if (lifeRatio > 0.25) {
      particle.char = "·";
    } else {
      particle.char = ".";
    }

    if (particle.life > 0) {
      newParticles.push(particle);
    }
  }
  particlesRef.current = newParticles;

  // Build grid
  const grid: Array<Array<{ char: string; color: string } | null>> = Array.from(
    { length: rows },
    () => Array(columns).fill(null),
  );

  // Render rockets with trails
  for (const rocket of rocketsRef.current) {
    const x = Math.floor(rocket.x);
    const y = Math.floor(rocket.y);
    if (y >= 0 && y < rows && x >= 0 && x < columns) {
      grid[y][x] = { char: "|", color: rocket.color };
    }
    if (y + 1 >= 0 && y + 1 < rows && x >= 0 && x < columns && !grid[y + 1][x]) {
      grid[y + 1][x] = { char: ":", color: "#888888" };
    }
    if (y + 2 >= 0 && y + 2 < rows && x >= 0 && x < columns && !grid[y + 2][x]) {
      grid[y + 2][x] = { char: ".", color: "#555555" };
    }
  }

  // Render particles
  for (const particle of particlesRef.current) {
    const x = Math.floor(particle.x);
    const y = Math.floor(particle.y);
    if (y >= 0 && y < rows && x >= 0 && x < columns) {
      grid[y][x] = { char: particle.char, color: particle.color };
    }
  }

  // Render grid to output
  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
};

export const fireworks: ScreensaverModule = {
  name: "fireworks",
  description: "Colorful firework rockets and explosions",
  component: Fireworks,
  fps: 15,
};
