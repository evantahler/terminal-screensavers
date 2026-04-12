import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

const PADDLE_HEIGHT = 5;
const PADDLE_CHAR = "█";
const BALL_CHAR = "●";
const BALL_COLOR = "#ffffff";
const PADDLE_COLOR_LEFT = "#00aaff";
const PADDLE_COLOR_RIGHT = "#ff4444";
const SCORE_COLOR = "#888888";
const NET_COLOR = "#333333";
const AI_REACTION_SPEED = 0.6;
const AI_MISS_CHANCE = 0.08;
const BALL_SPEED_INCREASE = 0.02;
const INITIAL_BALL_SPEED = 0.8;
const MAX_BALL_SPEED = 2.5;

interface PongState {
  ballX: number;
  ballY: number;
  ballVX: number;
  ballVY: number;
  paddleLeftY: number;
  paddleRightY: number;
  scoreLeft: number;
  scoreRight: number;
  ballSpeed: number;
  targetLeftY: number;
  targetRightY: number;
  missLeft: boolean;
  missRight: boolean;
  initialized: boolean;
  lastColumns: number;
  lastRows: number;
}

function initState(columns: number, rows: number): PongState {
  const height = rows - 1;
  const angle = Math.random() * 0.8 - 0.4 + (Math.random() < 0.5 ? Math.PI : 0);
  return {
    ballX: columns / 2,
    ballY: height / 2,
    ballVX: Math.cos(angle) * INITIAL_BALL_SPEED,
    ballVY: Math.sin(angle) * INITIAL_BALL_SPEED,
    paddleLeftY: height / 2 - PADDLE_HEIGHT / 2,
    paddleRightY: height / 2 - PADDLE_HEIGHT / 2,
    scoreLeft: 0,
    scoreRight: 0,
    ballSpeed: INITIAL_BALL_SPEED,
    targetLeftY: height / 2,
    targetRightY: height / 2,
    missLeft: false,
    missRight: false,
    initialized: true,
    lastColumns: columns,
    lastRows: rows,
  };
}

function resetBall(s: PongState, columns: number, rows: number) {
  const height = rows - 1;
  s.ballX = columns / 2;
  s.ballY = height / 2;
  const angle = Math.random() * 0.8 - 0.4 + (Math.random() < 0.5 ? Math.PI : 0);
  s.ballSpeed = INITIAL_BALL_SPEED;
  s.ballVX = Math.cos(angle) * s.ballSpeed;
  s.ballVY = Math.sin(angle) * s.ballSpeed;
  s.missLeft = Math.random() < AI_MISS_CHANCE;
  s.missRight = Math.random() < AI_MISS_CHANCE;
}

function renderDigit(digit: string): string[] {
  const digits: Record<string, string[]> = {
    "0": ["┌─┐", "│ │", "│ │", "│ │", "└─┘"],
    "1": ["  ╷", "  │", "  │", "  │", "  ╵"],
    "2": ["┌─┐", "  │", "┌─┘", "│  ", "└─┘"],
    "3": ["┌─┐", "  │", " ─┤", "  │", "└─┘"],
    "4": ["╷ ╷", "│ │", "└─┤", "  │", "  ╵"],
    "5": ["┌─┐", "│  ", "└─┐", "  │", "└─┘"],
    "6": ["┌─┐", "│  ", "├─┐", "│ │", "└─┘"],
    "7": ["┌─┐", "  │", "  │", "  │", "  ╵"],
    "8": ["┌─┐", "│ │", "├─┤", "│ │", "└─┘"],
    "9": ["┌─┐", "│ │", "└─┤", "  │", "└─┘"],
  };
  return digits[digit] || ["   ", "   ", "   ", "   ", "   "];
}

function renderScore(score: number): string[] {
  const str = String(score).padStart(2, " ");
  const digitArrays = str.split("").map((ch) => {
    if (ch === " ") return ["   ", "   ", "   ", "   ", "   "];
    return renderDigit(ch);
  });
  return digitArrays[0].map((_, row) =>
    digitArrays.map((d) => d[row]).join(" "),
  );
}

function Pong({ columns, rows }: ScreensaverProps) {
  const stateRef = useRef<PongState | null>(null);

  if (
    !stateRef.current ||
    stateRef.current.lastColumns !== columns ||
    stateRef.current.lastRows !== rows
  ) {
    stateRef.current = initState(columns, rows);
  }

  const s = stateRef.current;
  const height = rows - 1;
  const paddleLeftX = 2;
  const paddleRightX = columns - 3;

  // AI tracking
  if (s.ballVX < 0) {
    s.targetLeftY = s.missLeft
      ? height / 2
      : s.ballY - PADDLE_HEIGHT / 2 + (Math.random() - 0.5) * 2;
  }
  if (s.ballVX > 0) {
    s.targetRightY = s.missRight
      ? height / 2
      : s.ballY - PADDLE_HEIGHT / 2 + (Math.random() - 0.5) * 2;
  }

  const leftDiff = s.targetLeftY - s.paddleLeftY;
  s.paddleLeftY += leftDiff * AI_REACTION_SPEED;
  const rightDiff = s.targetRightY - s.paddleRightY;
  s.paddleRightY += rightDiff * AI_REACTION_SPEED;

  // Clamp paddles
  s.paddleLeftY = Math.max(0, Math.min(height - PADDLE_HEIGHT, s.paddleLeftY));
  s.paddleRightY = Math.max(
    0,
    Math.min(height - PADDLE_HEIGHT, s.paddleRightY),
  );

  // Move ball
  s.ballX += s.ballVX;
  s.ballY += s.ballVY;

  // Top/bottom bounce
  if (s.ballY <= 0) {
    s.ballY = 0;
    s.ballVY = Math.abs(s.ballVY);
  }
  if (s.ballY >= height - 1) {
    s.ballY = height - 1;
    s.ballVY = -Math.abs(s.ballVY);
  }

  // Left paddle collision
  if (
    s.ballX <= paddleLeftX + 1 &&
    s.ballX >= paddleLeftX - 1 &&
    s.ballVX < 0
  ) {
    const paddleCenter = s.paddleLeftY + PADDLE_HEIGHT / 2;
    if (
      s.ballY >= s.paddleLeftY - 0.5 &&
      s.ballY <= s.paddleLeftY + PADDLE_HEIGHT + 0.5
    ) {
      s.ballX = paddleLeftX + 1;
      const offset = (s.ballY - paddleCenter) / (PADDLE_HEIGHT / 2);
      s.ballSpeed = Math.min(s.ballSpeed + BALL_SPEED_INCREASE, MAX_BALL_SPEED);
      s.ballVX = Math.abs(Math.cos(offset * 0.6)) * s.ballSpeed;
      s.ballVY = Math.sin(offset * 0.6) * s.ballSpeed;
    }
  }

  // Right paddle collision
  if (
    s.ballX >= paddleRightX - 1 &&
    s.ballX <= paddleRightX + 1 &&
    s.ballVX > 0
  ) {
    const paddleCenter = s.paddleRightY + PADDLE_HEIGHT / 2;
    if (
      s.ballY >= s.paddleRightY - 0.5 &&
      s.ballY <= s.paddleRightY + PADDLE_HEIGHT + 0.5
    ) {
      s.ballX = paddleRightX - 1;
      const offset = (s.ballY - paddleCenter) / (PADDLE_HEIGHT / 2);
      s.ballSpeed = Math.min(s.ballSpeed + BALL_SPEED_INCREASE, MAX_BALL_SPEED);
      s.ballVX = -Math.abs(Math.cos(offset * 0.6)) * s.ballSpeed;
      s.ballVY = Math.sin(offset * 0.6) * s.ballSpeed;
    }
  }

  // Score
  if (s.ballX <= 0) {
    s.scoreRight++;
    resetBall(s, columns, rows);
  }
  if (s.ballX >= columns - 1) {
    s.scoreLeft++;
    resetBall(s, columns, rows);
  }

  // Render score strings
  const leftScoreLines = renderScore(s.scoreLeft);
  const rightScoreLines = renderScore(s.scoreRight);
  const scoreWidth = leftScoreLines[0].length;
  const scoreStartY = 1;
  const leftScoreX = Math.floor(columns / 4 - scoreWidth / 2);
  const rightScoreX = Math.floor((3 * columns) / 4 - scoreWidth / 2);

  // Build display
  const lines: React.ReactNode[] = [];
  const bx = Math.round(s.ballX);
  const by = Math.round(s.ballY);
  const pLeftY = Math.round(s.paddleLeftY);
  const pRightY = Math.round(s.paddleRightY);
  const centerX = Math.floor(columns / 2);

  for (let y = 0; y < height; y++) {
    const row: (SparseCell | null)[] = new Array(columns).fill(null);

    // Center net (dashed)
    if (y % 2 === 0) {
      row[centerX] = { char: "│", color: NET_COLOR };
    }

    // Left paddle
    if (y >= pLeftY && y < pLeftY + PADDLE_HEIGHT) {
      row[paddleLeftX] = { char: PADDLE_CHAR, color: PADDLE_COLOR_LEFT };
    }

    // Right paddle
    if (y >= pRightY && y < pRightY + PADDLE_HEIGHT) {
      row[paddleRightX] = { char: PADDLE_CHAR, color: PADDLE_COLOR_RIGHT };
    }

    // Score display
    const scoreLineIdx = y - scoreStartY;
    if (scoreLineIdx >= 0 && scoreLineIdx < leftScoreLines.length) {
      const leftLine = leftScoreLines[scoreLineIdx];
      for (let i = 0; i < leftLine.length; i++) {
        const sx = leftScoreX + i;
        if (sx >= 0 && sx < columns && leftLine[i] !== " ") {
          row[sx] = { char: leftLine[i], color: SCORE_COLOR };
        }
      }
      const rightLine = rightScoreLines[scoreLineIdx];
      for (let i = 0; i < rightLine.length; i++) {
        const sx = rightScoreX + i;
        if (sx >= 0 && sx < columns && rightLine[i] !== " ") {
          row[sx] = { char: rightLine[i], color: SCORE_COLOR };
        }
      }
    }

    // Ball (drawn last so it's always visible)
    if (y === by && bx >= 0 && bx < columns) {
      row[bx] = { char: BALL_CHAR, color: BALL_COLOR, bold: true };
    }

    lines.push(renderSparseRow(row, y));
  }

  return <Box flexDirection="column">{lines}</Box>;
}

export const pong: ScreensaverModule = {
  name: "pong",
  description: "Two AI paddles playing an endless game of Pong",
  component: Pong,
  fps: 30,
};
