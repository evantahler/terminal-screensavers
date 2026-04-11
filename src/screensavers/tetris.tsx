import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

// Standard Tetris pieces with their rotations (each piece has 4 rotations)
// Coordinates are [row, col] offsets from the piece origin
const PIECES: number[][][][] = [
  // I
  [
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
  ],
  // O
  [
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
  ],
  // T
  [
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [0, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, -1],
    ],
  ],
  // S
  [
    [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  // Z
  [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ],
  ],
  // L
  [
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [0, 2],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  ],
  // J
  [
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  ],
];

const PIECE_COLORS = [
  "#00ffff", // I - cyan
  "#ffff00", // O - yellow
  "#aa00ff", // T - purple
  "#00ff00", // S - green
  "#ff0000", // Z - red
  "#ff8800", // L - orange
  "#0044ff", // J - blue
];

const PIECE_NAMES = ["I", "O", "T", "S", "Z", "L", "J"];

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

interface Cell {
  filled: boolean;
  color: string;
}

interface FallingPiece {
  type: number;
  rotation: number;
  row: number;
  col: number;
}

type GamePhase = "falling" | "locking" | "clearing" | "gameover" | "restarting";

interface TetrisState {
  board: Cell[][];
  current: FallingPiece;
  next: number;
  score: number;
  lines: number;
  level: number;
  phase: GamePhase;
  phaseFrame: number;
  dropFrame: number;
  clearingRows: number[];
  initialized: boolean;
  bag: number[];
}

function createEmptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => ({ filled: false, color: "" })),
  );
}

function nextFromBag(bag: number[]): number {
  if (bag.length === 0) {
    // Refill with shuffled 0-6
    for (let i = 0; i < 7; i++) bag.push(i);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return bag.pop() as number;
}

function getPieceCells(piece: FallingPiece): number[][] {
  return PIECES[piece.type][piece.rotation].map(([r, c]) => [
    piece.row + r,
    piece.col + c,
  ]);
}

function collides(board: Cell[][], piece: FallingPiece): boolean {
  for (const [r, c] of getPieceCells(piece)) {
    if (r < 0 || r >= BOARD_HEIGHT || c < 0 || c >= BOARD_WIDTH) return true;
    if (board[r][c].filled) return true;
  }
  return false;
}

function findBestPlacement(
  board: Cell[][],
  pieceType: number,
): { col: number; rotation: number } {
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestCol = 0;
  let bestRotation = 0;

  for (let rotation = 0; rotation < 4; rotation++) {
    for (let col = -2; col < BOARD_WIDTH + 2; col++) {
      const piece: FallingPiece = { type: pieceType, rotation, row: 0, col };
      // Check if starting position is valid
      if (collides(board, piece)) continue;

      // Drop piece to bottom
      let dropRow = 0;
      while (!collides(board, { ...piece, row: dropRow + 1 })) {
        dropRow++;
      }
      piece.row = dropRow;

      // Score this placement
      const testBoard = board.map((row) => row.map((cell) => ({ ...cell })));
      for (const [r, c] of getPieceCells(piece)) {
        if (r >= 0 && r < BOARD_HEIGHT && c >= 0 && c < BOARD_WIDTH) {
          testBoard[r][c] = { filled: true, color: PIECE_COLORS[pieceType] };
        }
      }

      // Count completed lines
      let completedLines = 0;
      for (let r = 0; r < BOARD_HEIGHT; r++) {
        if (testBoard[r].every((cell) => cell.filled)) completedLines++;
      }

      // Count holes (empty cells with filled cells above)
      let holes = 0;
      for (let c = 0; c < BOARD_WIDTH; c++) {
        let foundFilled = false;
        for (let r = 0; r < BOARD_HEIGHT; r++) {
          if (testBoard[r][c].filled) foundFilled = true;
          else if (foundFilled) holes++;
        }
      }

      // Aggregate height
      let aggregateHeight = 0;
      for (let c = 0; c < BOARD_WIDTH; c++) {
        for (let r = 0; r < BOARD_HEIGHT; r++) {
          if (testBoard[r][c].filled) {
            aggregateHeight += BOARD_HEIGHT - r;
            break;
          }
        }
      }

      // Bumpiness (height differences between adjacent columns)
      let bumpiness = 0;
      const heights: number[] = [];
      for (let c = 0; c < BOARD_WIDTH; c++) {
        let h = 0;
        for (let r = 0; r < BOARD_HEIGHT; r++) {
          if (testBoard[r][c].filled) {
            h = BOARD_HEIGHT - r;
            break;
          }
        }
        heights.push(h);
      }
      for (let c = 0; c < heights.length - 1; c++) {
        bumpiness += Math.abs(heights[c] - heights[c + 1]);
      }

      // Weighted score — intentionally imperfect for visual interest
      const score =
        completedLines * 100 -
        holes * 35 -
        aggregateHeight * 3 -
        bumpiness * 5 +
        (Math.random() * 15 - 7); // small randomness for variety

      if (score > bestScore) {
        bestScore = score;
        bestCol = col;
        bestRotation = rotation;
      }
    }
  }

  return { col: bestCol, rotation: bestRotation };
}

function spawnPiece(pieceType: number, board: Cell[][]): FallingPiece {
  const { col, rotation } = findBestPlacement(board, pieceType);
  return { type: pieceType, rotation, row: 0, col };
}

const FallingTetris: React.FC<ScreensaverProps> = ({ columns, rows }) => {
  const stateRef = useRef<TetrisState | null>(null);

  if (stateRef.current === null) {
    const bag: number[] = [];
    const firstType = nextFromBag(bag);
    const nextType = nextFromBag(bag);
    const board = createEmptyBoard();
    stateRef.current = {
      board,
      current: spawnPiece(firstType, board),
      next: nextType,
      score: 0,
      lines: 0,
      level: 1,
      phase: "falling",
      phaseFrame: 0,
      dropFrame: 0,
      clearingRows: [],
      initialized: true,
      bag,
    };
  }

  const s = stateRef.current;

  // Drop speed: frames per drop, decreases with level
  const dropInterval = Math.max(2, 12 - s.level);

  if (s.phase === "falling") {
    s.dropFrame++;
    if (s.dropFrame >= dropInterval) {
      s.dropFrame = 0;
      const moved = { ...s.current, row: s.current.row + 1 };
      if (collides(s.board, moved)) {
        // Lock piece
        s.phase = "locking";
        s.phaseFrame = 0;
      } else {
        s.current = moved;
      }
    }
  } else if (s.phase === "locking") {
    // Place piece on board
    for (const [r, c] of getPieceCells(s.current)) {
      if (r >= 0 && r < BOARD_HEIGHT && c >= 0 && c < BOARD_WIDTH) {
        s.board[r][c] = {
          filled: true,
          color: PIECE_COLORS[s.current.type],
        };
      }
    }

    // Check for completed lines
    const clearRows: number[] = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      if (s.board[r].every((cell) => cell.filled)) {
        clearRows.push(r);
      }
    }

    if (clearRows.length > 0) {
      s.clearingRows = clearRows;
      s.phase = "clearing";
      s.phaseFrame = 0;
    } else {
      // Spawn next piece
      const nextType = nextFromBag(s.bag);
      const newPiece = spawnPiece(s.next, s.board);
      if (collides(s.board, newPiece)) {
        s.phase = "gameover";
        s.phaseFrame = 0;
      } else {
        s.current = newPiece;
        s.next = nextType;
        s.phase = "falling";
        s.dropFrame = 0;
      }
    }
  } else if (s.phase === "clearing") {
    s.phaseFrame++;
    if (s.phaseFrame >= 10) {
      // Flash animation done, remove lines
      const linesCleared = s.clearingRows.length;
      // Remove cleared rows and add empty ones at top
      const newBoard = s.board.filter((_, i) => !s.clearingRows.includes(i));
      while (newBoard.length < BOARD_HEIGHT) {
        newBoard.unshift(
          Array.from({ length: BOARD_WIDTH }, () => ({
            filled: false,
            color: "",
          })),
        );
      }
      s.board = newBoard;

      // Score: 100, 300, 500, 800 for 1-4 lines
      const lineScores = [0, 100, 300, 500, 800];
      s.score += (lineScores[linesCleared] || 0) * s.level;
      s.lines += linesCleared;
      s.level = Math.floor(s.lines / 10) + 1;

      s.clearingRows = [];

      // Spawn next
      const nextType = nextFromBag(s.bag);
      const newPiece = spawnPiece(s.next, s.board);
      if (collides(s.board, newPiece)) {
        s.phase = "gameover";
        s.phaseFrame = 0;
      } else {
        s.current = newPiece;
        s.next = nextType;
        s.phase = "falling";
        s.dropFrame = 0;
      }
    }
  } else if (s.phase === "gameover") {
    s.phaseFrame++;
    if (s.phaseFrame >= 45) {
      s.phase = "restarting";
      s.phaseFrame = 0;
    }
  } else if (s.phase === "restarting") {
    s.phaseFrame++;
    if (s.phaseFrame >= 15) {
      // Full reset
      const bag: number[] = [];
      const firstType = nextFromBag(bag);
      const nextType = nextFromBag(bag);
      const board = createEmptyBoard();
      s.board = board;
      s.current = spawnPiece(firstType, board);
      s.next = nextType;
      s.score = 0;
      s.lines = 0;
      s.level = 1;
      s.phase = "falling";
      s.phaseFrame = 0;
      s.dropFrame = 0;
      s.clearingRows = [];
      s.bag = bag;
    }
  }

  // Rendering
  const contentHeight = rows - 1;
  const grid: Array<Array<{ char: string; color: string } | null>> = Array.from(
    { length: contentHeight },
    () => Array(columns).fill(null),
  );

  // Center the board
  const boardPixelWidth = BOARD_WIDTH * 2; // each cell is 2 chars wide
  const sidebarWidth = 14;
  const totalWidth = boardPixelWidth + 2 + sidebarWidth; // 2 for borders
  const offsetX = Math.floor((columns - totalWidth) / 2);
  const offsetY = Math.max(
    1,
    Math.floor((contentHeight - BOARD_HEIGHT - 2) / 2),
  );

  // Draw board border
  for (let r = -1; r <= BOARD_HEIGHT; r++) {
    const gy = offsetY + r + 1;
    const leftX = offsetX;
    const rightX = offsetX + boardPixelWidth + 1;
    if (gy >= 0 && gy < contentHeight) {
      if (r === -1) {
        // Top border
        if (leftX >= 0 && leftX < columns)
          grid[gy][leftX] = { char: "┌", color: "#555555" };
        for (let i = 1; i <= boardPixelWidth; i++) {
          const x = offsetX + i;
          if (x >= 0 && x < columns)
            grid[gy][x] = { char: "─", color: "#555555" };
        }
        if (rightX >= 0 && rightX < columns)
          grid[gy][rightX] = { char: "┐", color: "#555555" };
      } else if (r === BOARD_HEIGHT) {
        // Bottom border
        if (leftX >= 0 && leftX < columns)
          grid[gy][leftX] = { char: "└", color: "#555555" };
        for (let i = 1; i <= boardPixelWidth; i++) {
          const x = offsetX + i;
          if (x >= 0 && x < columns)
            grid[gy][x] = { char: "─", color: "#555555" };
        }
        if (rightX >= 0 && rightX < columns)
          grid[gy][rightX] = { char: "┘", color: "#555555" };
      } else {
        // Side borders
        if (leftX >= 0 && leftX < columns)
          grid[gy][leftX] = { char: "│", color: "#555555" };
        if (rightX >= 0 && rightX < columns)
          grid[gy][rightX] = { char: "│", color: "#555555" };
      }
    }
  }

  // Draw board cells
  for (let r = 0; r < BOARD_HEIGHT; r++) {
    for (let c = 0; c < BOARD_WIDTH; c++) {
      const gy = offsetY + r + 1;
      const gx = offsetX + 1 + c * 2;
      if (gy >= 0 && gy < contentHeight) {
        if (s.board[r][c].filled) {
          const isClearing =
            s.phase === "clearing" && s.clearingRows.includes(r);
          const flashOn = isClearing && Math.floor(s.phaseFrame / 2) % 2 === 0;
          const color = isClearing
            ? flashOn
              ? "#ffffff"
              : s.board[r][c].color
            : s.board[r][c].color;
          const char = isClearing && flashOn ? "░░" : "██";
          for (let dx = 0; dx < 2; dx++) {
            if (gx + dx >= 0 && gx + dx < columns) {
              grid[gy][gx + dx] = {
                char: char[dx],
                color,
              };
            }
          }
        }
      }
    }
  }

  // Draw current falling piece
  if (s.phase === "falling" || s.phase === "locking") {
    for (const [r, c] of getPieceCells(s.current)) {
      if (r >= 0 && r < BOARD_HEIGHT) {
        const gy = offsetY + r + 1;
        const gx = offsetX + 1 + c * 2;
        if (gy >= 0 && gy < contentHeight) {
          for (let dx = 0; dx < 2; dx++) {
            if (gx + dx >= 0 && gx + dx < columns) {
              grid[gy][gx + dx] = {
                char: "█",
                color: PIECE_COLORS[s.current.type],
              };
            }
          }
        }
      }
    }

    // Draw ghost piece (drop shadow)
    let ghostRow = s.current.row;
    while (!collides(s.board, { ...s.current, row: ghostRow + 1 })) {
      ghostRow++;
    }
    if (ghostRow !== s.current.row) {
      const ghostPiece = { ...s.current, row: ghostRow };
      for (const [r, c] of getPieceCells(ghostPiece)) {
        if (r >= 0 && r < BOARD_HEIGHT) {
          const gy = offsetY + r + 1;
          const gx = offsetX + 1 + c * 2;
          if (gy >= 0 && gy < contentHeight) {
            for (let dx = 0; dx < 2; dx++) {
              if (gx + dx >= 0 && gx + dx < columns) {
                // Only draw ghost if cell isn't already occupied
                if (!grid[gy][gx + dx] || grid[gy][gx + dx]?.char === " ") {
                  grid[gy][gx + dx] = {
                    char: "░",
                    color: PIECE_COLORS[s.current.type],
                  };
                }
              }
            }
          }
        }
      }
    }
  }

  // Draw sidebar
  const sideX = offsetX + boardPixelWidth + 3;
  const drawText = (text: string, row: number, color: string) => {
    for (let i = 0; i < text.length; i++) {
      const x = sideX + i;
      if (x >= 0 && x < columns && row >= 0 && row < contentHeight) {
        grid[row][x] = { char: text[i], color };
      }
    }
  };

  // Next piece preview
  const nextLabelY = offsetY + 1;
  drawText("NEXT", nextLabelY, "#888888");

  const nextPiece = PIECES[s.next][0];
  for (const [r, c] of nextPiece) {
    const gy = nextLabelY + 1 + r;
    const gx = sideX + c * 2;
    if (gy >= 0 && gy < contentHeight) {
      for (let dx = 0; dx < 2; dx++) {
        if (gx + dx >= 0 && gx + dx < columns) {
          grid[gy][gx + dx] = { char: "█", color: PIECE_COLORS[s.next] };
        }
      }
    }
  }

  // Score
  const scoreY = nextLabelY + 6;
  drawText("SCORE", scoreY, "#888888");
  drawText(String(s.score), scoreY + 1, "#ffffff");

  // Lines
  const linesY = scoreY + 3;
  drawText("LINES", linesY, "#888888");
  drawText(String(s.lines), linesY + 1, "#ffffff");

  // Level
  const levelY = linesY + 3;
  drawText("LEVEL", levelY, "#888888");
  drawText(String(s.level), levelY + 1, "#ffffff");

  // Game over text
  if (s.phase === "gameover" || s.phase === "restarting") {
    const text = "GAME OVER";
    const textY = offsetY + Math.floor(BOARD_HEIGHT / 2);
    const textX = offsetX + 1 + Math.floor((boardPixelWidth - text.length) / 2);
    for (let i = 0; i < text.length; i++) {
      const x = textX + i;
      if (x >= 0 && x < columns && textY >= 0 && textY < contentHeight) {
        grid[textY][x] = { char: text[i], color: "#ff0000" };
      }
    }
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, rowIndex) => (
        <Box key={rowIndex}>
          {row.map((cell, colIndex) =>
            cell ? (
              <Text key={colIndex} color={cell.color}>
                {cell.char}
              </Text>
            ) : (
              <Text key={colIndex}> </Text>
            ),
          )}
        </Box>
      ))}
    </Box>
  );
};

export const tetris: ScreensaverModule = {
  name: "tetris",
  description:
    "Auto-playing Tetris with falling pieces, line clears, and scoring",
  component: FallingTetris,
  fps: 15,
};
