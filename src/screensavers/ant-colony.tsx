import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

interface Ant {
  x: number;
  y: number;
  hasFood: boolean;
  dirX: number;
  dirY: number;
}

interface FoodSource {
  x: number;
  y: number;
  amount: number;
}

interface State {
  ants: Ant[];
  foodPheromones: Float32Array;
  homePheromones: Float32Array;
  foodSources: FoodSource[];
  nestX: number;
  nestY: number;
  width: number;
  height: number;
  foodDelivered: number;
}

const DIRECTIONS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

const ANT_COUNT = 80;
const PHEROMONE_DECAY = 0.985;
const FOOD_SOURCES_COUNT = 5;
const FOOD_PER_SOURCE = 200;

function idx(x: number, y: number, width: number): number {
  return y * width + x;
}

function createState(width: number, height: number): State {
  const nestX = Math.floor(width / 2);
  const nestY = Math.floor(height / 2);
  const size = width * height;

  const ants: Ant[] = Array.from({ length: ANT_COUNT }, () => {
    const dir = DIRECTIONS[Math.floor(Math.random() * 8)];
    return {
      x: nestX + Math.floor(Math.random() * 5 - 2),
      y: nestY + Math.floor(Math.random() * 5 - 2),
      hasFood: false,
      dirX: dir[0],
      dirY: dir[1],
    };
  });

  const foodSources: FoodSource[] = Array.from(
    { length: FOOD_SOURCES_COUNT },
    () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.25 + Math.random() * 0.3; /* 25-55% from center to edge */
      return {
        x: Math.floor(nestX + Math.cos(angle) * width * dist),
        y: Math.floor(nestY + Math.sin(angle) * height * dist),
        amount: FOOD_PER_SOURCE,
      };
    },
  );

  return {
    ants,
    foodPheromones: new Float32Array(size),
    homePheromones: new Float32Array(size),
    foodSources,
    nestX,
    nestY,
    width,
    height,
    foodDelivered: 0,
  };
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function steerAnt(
  ant: Ant,
  pheromones: Float32Array,
  width: number,
  height: number,
): void {
  // Sense pheromones in three directions: left, forward, right
  const forward =
    pheromones[
      idx(
        clamp(ant.x + ant.dirX, 0, width - 1),
        clamp(ant.y + ant.dirY, 0, height - 1),
        width,
      )
    ];

  // Rotate direction 45° left and right
  const ldx = ant.dirX === 0 ? -ant.dirY : ant.dirX;
  const ldy = ant.dirY === 0 ? ant.dirX : ant.dirY;
  const rdx = ant.dirX === 0 ? ant.dirY : ant.dirX;
  const rdy = ant.dirY === 0 ? -ant.dirX : ant.dirY;

  const left =
    pheromones[
      idx(
        clamp(ant.x + ldx, 0, width - 1),
        clamp(ant.y + ldy, 0, height - 1),
        width,
      )
    ];
  const right =
    pheromones[
      idx(
        clamp(ant.x + rdx, 0, width - 1),
        clamp(ant.y + rdy, 0, height - 1),
        width,
      )
    ];

  if (forward >= left && forward >= right) {
    // Keep going, small random wobble
    if (Math.random() < 0.15) {
      const dir = DIRECTIONS[Math.floor(Math.random() * 8)];
      ant.dirX = dir[0];
      ant.dirY = dir[1];
    }
  } else if (left > right) {
    ant.dirX = ldx;
    ant.dirY = ldy;
  } else {
    ant.dirX = rdx;
    ant.dirY = rdy;
  }
}

function stepSimulation(s: State): void {
  const { width, height, ants, foodPheromones, homePheromones, foodSources } =
    s;

  // Decay pheromones
  for (let i = 0; i < foodPheromones.length; i++) {
    foodPheromones[i] *= PHEROMONE_DECAY;
    homePheromones[i] *= PHEROMONE_DECAY;
    if (foodPheromones[i] < 0.01) foodPheromones[i] = 0;
    if (homePheromones[i] < 0.01) homePheromones[i] = 0;
  }

  for (const ant of ants) {
    if (ant.hasFood) {
      // Heading home, follow home pheromones + bias toward nest
      steerAnt(ant, homePheromones, width, height);

      // Also bias toward nest
      if (Math.random() < 0.3) {
        const dx = s.nestX - ant.x;
        const dy = s.nestY - ant.y;
        ant.dirX = dx === 0 ? ant.dirX : dx > 0 ? 1 : -1;
        ant.dirY = dy === 0 ? ant.dirY : dy > 0 ? 1 : -1;
      }

      // Drop food pheromone
      foodPheromones[idx(ant.x, ant.y, width)] = Math.min(
        foodPheromones[idx(ant.x, ant.y, width)] + 1.0,
        5.0,
      );
    } else {
      // Searching for food, follow food pheromones
      steerAnt(ant, foodPheromones, width, height);

      // Drop home pheromone
      homePheromones[idx(ant.x, ant.y, width)] = Math.min(
        homePheromones[idx(ant.x, ant.y, width)] + 1.0,
        5.0,
      );
    }

    // Move
    ant.x = clamp(ant.x + ant.dirX, 0, width - 1);
    ant.y = clamp(ant.y + ant.dirY, 0, height - 1);

    // Bounce off edges
    if (ant.x <= 0 || ant.x >= width - 1) ant.dirX = -ant.dirX;
    if (ant.y <= 0 || ant.y >= height - 1) ant.dirY = -ant.dirY;

    // Check for food pickup
    if (!ant.hasFood) {
      for (const food of foodSources) {
        if (
          food.amount > 0 &&
          Math.abs(ant.x - food.x) <= 2 &&
          Math.abs(ant.y - food.y) <= 2
        ) {
          ant.hasFood = true;
          food.amount--;
          // Turn around
          ant.dirX = -ant.dirX;
          ant.dirY = -ant.dirY;
          break;
        }
      }
    }

    // Check for nest delivery
    if (
      ant.hasFood &&
      Math.abs(ant.x - s.nestX) <= 2 &&
      Math.abs(ant.y - s.nestY) <= 2
    ) {
      ant.hasFood = false;
      s.foodDelivered++;
      // Turn around to find more food
      ant.dirX = -ant.dirX;
      ant.dirY = -ant.dirY;
    }
  }

  // Replenish depleted food sources
  const totalFood = foodSources.reduce((sum, f) => sum + f.amount, 0);
  if (totalFood < 50) {
    for (const food of foodSources) {
      if (food.amount <= 0) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 0.25 + Math.random() * 0.3;
        food.x = clamp(
          Math.floor(s.nestX + Math.cos(angle) * width * dist),
          1,
          width - 2,
        );
        food.y = clamp(
          Math.floor(s.nestY + Math.sin(angle) * height * dist),
          1,
          height - 2,
        );
        food.amount = FOOD_PER_SOURCE;
      }
    }
  }
}

const PHEROMONE_CHARS = [" ", "·", "∙", "░", "▒", "▓"];
const PHEROMONE_COLORS_FOOD = [
  "#111111",
  "#1a3a1a",
  "#2a5a2a",
  "#3a8a3a",
  "#4aba4a",
  "#5aff5a",
];
const PHEROMONE_COLORS_HOME = [
  "#111111",
  "#2a1a3a",
  "#4a2a6a",
  "#6a3a9a",
  "#8a4aca",
  "#aa5afa",
];

const AntColony: React.FC<ScreensaverProps> = ({ columns, rows, frame }) => {
  const stateRef = useRef<State | null>(null);
  const prevSizeRef = useRef({ w: 0, h: 0 });

  const height = rows - 1;
  const width = columns;

  // Reinit on size change
  if (
    stateRef.current === null ||
    prevSizeRef.current.w !== width ||
    prevSizeRef.current.h !== height
  ) {
    stateRef.current = createState(width, height);
    prevSizeRef.current = { w: width, h: height };
  }

  const s = stateRef.current;

  // Advance simulation
  stepSimulation(s);

  // Build display grid
  const display: { char: string; color: string }[][] = Array.from(
    { length: height },
    () => Array.from({ length: width }, () => ({ char: " ", color: "" })),
  );

  // Render pheromone trails
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const fi = s.foodPheromones[idx(x, y, width)];
      const hi = s.homePheromones[idx(x, y, width)];
      const maxP = Math.max(fi, hi);
      if (maxP > 0.05) {
        const level = Math.min(
          Math.floor(maxP * 2),
          PHEROMONE_CHARS.length - 1,
        );
        if (level > 0) {
          display[y][x].char = PHEROMONE_CHARS[level];
          display[y][x].color =
            fi > hi
              ? PHEROMONE_COLORS_FOOD[level]
              : PHEROMONE_COLORS_HOME[level];
        }
      }
    }
  }

  // Render food sources
  for (const food of s.foodSources) {
    if (food.amount <= 0) continue;
    const radius = food.amount > 100 ? 2 : food.amount > 30 ? 1 : 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const fx = food.x + dx;
        const fy = food.y + dy;
        if (fx >= 0 && fx < width && fy >= 0 && fy < height) {
          display[fy][fx] = { char: "◆", color: "#ffaa00" };
        }
      }
    }
  }

  // Render nest
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const nx = s.nestX + dx;
      const ny = s.nestY + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const isEdge = Math.abs(dx) === 2 || Math.abs(dy) === 2;
        display[ny][nx] = {
          char: isEdge ? "▪" : "█",
          color: isEdge ? "#884422" : "#aa6633",
        };
      }
    }
  }

  // Render ants
  for (const ant of s.ants) {
    if (ant.x >= 0 && ant.x < width && ant.y >= 0 && ant.y < height) {
      display[ant.y][ant.x] = {
        char: ant.hasFood ? "●" : "•",
        color: ant.hasFood ? "#ff4444" : "#ffffff",
      };
    }
  }

  return (
    <Box flexDirection="column">
      {display.map((row, y) => (
        <Box key={y}>
          <Text>
            {row.map((cell, x) =>
              cell.char === " " ? (
                " "
              ) : (
                <Text key={x} color={cell.color}>
                  {cell.char}
                </Text>
              ),
            )}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

export const antColony: ScreensaverModule = {
  name: "ant-colony",
  description: "Simulated ants leaving pheromone trails between nest and food",
  component: AntColony,
  fps: 15,
};
