import { Box, Text } from "ink";
import type React from "react";

/** Bounce a value between min and max, reversing velocity on collision. */
export function bounce(
  pos: number,
  vel: number,
  max: number,
): { pos: number; vel: number; bounced: boolean } {
  const newPos = pos + vel;

  if (newPos <= 0) {
    return { pos: 0, vel: Math.abs(vel), bounced: true };
  }
  if (newPos >= max) {
    return { pos: max, vel: -Math.abs(vel), bounced: true };
  }

  return { pos: newPos, vel, bounced: false };
}

export interface SparseCell {
  char: string;
  color: string;
  bold?: boolean;
}

/** Render a sparse row, grouping consecutive spaces and merging adjacent same-colored cells. */
export function renderSparseRow(
  row: (SparseCell | null)[],
  y: number,
): React.ReactNode {
  const segments: React.ReactNode[] = [];
  let spaces = "";
  let runChars = "";
  let runColor = "";
  let runBold = false;
  let runStart = 0;

  function flushRun() {
    if (runChars) {
      segments.push(
        <Text key={runStart} color={runColor} bold={runBold}>
          {runChars}
        </Text>,
      );
      runChars = "";
    }
  }

  for (let x = 0; x < row.length; x++) {
    const cell = row[x];
    if (!cell || cell.char === " ") {
      flushRun();
      spaces += " ";
    } else {
      if (spaces) {
        segments.push(spaces);
        spaces = "";
      }
      if (
        runChars &&
        (cell.color !== runColor || (cell.bold ?? false) !== runBold)
      ) {
        flushRun();
      }
      if (!runChars) {
        runColor = cell.color;
        runBold = cell.bold ?? false;
        runStart = x;
      }
      runChars += cell.char;
    }
  }
  flushRun();
  if (spaces) segments.push(spaces);

  return (
    <Box key={y}>
      <Text>{segments}</Text>
    </Box>
  );
}
