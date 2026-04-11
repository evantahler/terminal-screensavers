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
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [filterText, setFilterText] = useState("");

  const filtered = filterText
    ? screensavers
        .map((s, i) => ({ screensaver: s, originalIndex: i }))
        .filter(({ screensaver }) =>
          screensaver.name.toLowerCase().includes(filterText.toLowerCase()),
        )
    : screensavers.map((s, i) => ({ screensaver: s, originalIndex: i }));

  const maxVisible = Math.max(1, rows - (filterText ? 7 : 6));
  const half = Math.floor(maxVisible / 2);
  let scrollStart = highlightedIndex - half;
  if (scrollStart < 0) scrollStart = 0;
  if (scrollStart + maxVisible > filtered.length) {
    scrollStart = Math.max(0, filtered.length - maxVisible);
  }
  const visibleItems = filtered.slice(scrollStart, scrollStart + maxVisible);

  useInput((input, key) => {
    if (key.escape) {
      if (filterText) {
        setFilterText("");
        setHighlightedIndex(0);
      } else {
        onDismiss();
      }
      return;
    }
    if (key.return) {
      if (filtered.length > 0) {
        onSelect(filtered[highlightedIndex].originalIndex);
      }
      return;
    }
    if (key.upArrow) {
      setHighlightedIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
      return;
    }
    if (key.downArrow) {
      setHighlightedIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
      return;
    }
    if (key.backspace || key.delete) {
      setFilterText((t) => t.slice(0, -1));
      setHighlightedIndex(0);
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      setFilterText((t) => t + input);
      setHighlightedIndex(0);
      return;
    }
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text bold color="cyan">
        {"  Select a Screensaver"}
      </Text>
      <Text dimColor>
        {"  ↑/↓ navigate  Enter select  Type to filter  Esc "}
        {filterText ? "clear" : "back"}
      </Text>
      {filterText ? (
        <Text>
          {"  Filter: "}
          <Text color="yellow">{filterText}</Text>
        </Text>
      ) : null}
      <Text>{""}</Text>
      {filtered.length === 0 ? (
        <Text dimColor>{"  No matches"}</Text>
      ) : (
        visibleItems.map((item, i) => {
          const realIndex = scrollStart + i;
          const isHighlighted = realIndex === highlightedIndex;
          const isCurrent = item.originalIndex === currentIndex;
          const prefix = isHighlighted ? "▸ " : "  ";
          const suffix = isCurrent ? " (playing)" : "";

          return (
            <Text key={item.screensaver.name}>
              <Text
                color={isHighlighted ? "green" : undefined}
                bold={isHighlighted}
              >
                {prefix}
                {item.screensaver.name}
              </Text>
              <Text dimColor>
                {" — "}
                {item.screensaver.description}
                {suffix}
              </Text>
            </Text>
          );
        })
      )}
      {scrollStart + maxVisible < filtered.length && (
        <Text dimColor>{"  ↓ more..."}</Text>
      )}
      {scrollStart > 0 && <Text dimColor>{"  ↑ more..."}</Text>}
    </Box>
  );
}
