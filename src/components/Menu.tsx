import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import type { ScreensaverModule } from "../types.js";

interface MenuProps {
  screensavers: ScreensaverModule[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onDismiss: () => void;
  rows: number;
}

export function Menu({
  screensavers,
  currentIndex,
  onSelect,
  onDismiss,
  rows,
}: MenuProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(currentIndex);

  const maxVisible = Math.max(1, rows - 6);
  const half = Math.floor(maxVisible / 2);
  let scrollStart = highlightedIndex - half;
  if (scrollStart < 0) scrollStart = 0;
  if (scrollStart + maxVisible > screensavers.length) {
    scrollStart = Math.max(0, screensavers.length - maxVisible);
  }
  const visibleItems = screensavers.slice(
    scrollStart,
    scrollStart + maxVisible,
  );

  useInput((input, key) => {
    if (key.escape) {
      onDismiss();
      return;
    }
    if (key.return) {
      onSelect(highlightedIndex);
      return;
    }
    if (key.upArrow) {
      setHighlightedIndex((i) => (i > 0 ? i - 1 : screensavers.length - 1));
      return;
    }
    if (key.downArrow) {
      setHighlightedIndex((i) => (i < screensavers.length - 1 ? i + 1 : 0));
      return;
    }
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text bold color="cyan">
        {"  Select a Screensaver"}
      </Text>
      <Text dimColor>{"  ↑/↓ navigate  Enter select  Esc back"}</Text>
      <Text>{""}</Text>
      {visibleItems.map((s, i) => {
        const realIndex = scrollStart + i;
        const isHighlighted = realIndex === highlightedIndex;
        const isCurrent = realIndex === currentIndex;
        const prefix = isHighlighted ? "▸ " : "  ";
        const suffix = isCurrent ? " (playing)" : "";

        return (
          <Text key={s.name}>
            <Text
              color={isHighlighted ? "green" : undefined}
              bold={isHighlighted}
            >
              {prefix}
              {s.name}
            </Text>
            <Text dimColor>
              {" — "}
              {s.description}
              {suffix}
            </Text>
          </Text>
        );
      })}
      {scrollStart + maxVisible < screensavers.length && (
        <Text dimColor>{"  ↓ more..."}</Text>
      )}
      {scrollStart > 0 && <Text dimColor>{"  ↑ more..."}</Text>}
    </Box>
  );
}
