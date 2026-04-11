import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

// Syntax highlighting colors (One Dark theme)
const KEYWORD_COLOR = "#c678dd";
const STRING_COLOR = "#98c379";
const COMMENT_COLOR = "#5c6370";
const NUMBER_COLOR = "#d19a66";
const FUNCTION_COLOR = "#61afef";
const TYPE_COLOR = "#e5c07b";
const OPERATOR_COLOR = "#56b6c2";
const DEFAULT_COLOR = "#abb2bf";
const LINE_NUM_COLOR = "#4b5263";

interface Token {
  text: string;
  color: string;
}

const TS_KEYWORDS = new Set([
  "function",
  "const",
  "let",
  "var",
  "if",
  "else",
  "for",
  "while",
  "return",
  "class",
  "new",
  "this",
  "import",
  "export",
  "from",
  "async",
  "await",
  "typeof",
  "instanceof",
  "type",
  "interface",
  "extends",
  "implements",
  "keyof",
  "readonly",
  "as",
  "never",
  "unknown",
  "void",
  "enum",
  "declare",
  "namespace",
  "abstract",
  "private",
  "protected",
  "public",
  "of",
  "in",
  "switch",
  "case",
  "default",
  "break",
  "continue",
  "throw",
  "try",
  "catch",
  "finally",
  "true",
  "false",
  "null",
  "undefined",
]);

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Line comments
    if (line[i] === "/" && line[i + 1] === "/") {
      tokens.push({ text: line.slice(i), color: COMMENT_COLOR });
      break;
    }
    // Block comments
    if (line[i] === "/" && line[i + 1] === "*") {
      const end = line.indexOf("*/", i + 2);
      const commentEnd = end >= 0 ? end + 2 : line.length;
      tokens.push({ text: line.slice(i, commentEnd), color: COMMENT_COLOR });
      i = commentEnd;
      continue;
    }

    // Strings
    if (line[i] === '"' || line[i] === "'" || line[i] === "`") {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === "\\") j++;
        j++;
      }
      j = Math.min(j + 1, line.length);
      tokens.push({ text: line.slice(i, j), color: STRING_COLOR });
      i = j;
      continue;
    }

    // Numbers
    if (
      /\d/.test(line[i]) &&
      (i === 0 || /[\s(,=<>+\-*/[\]{};:]/.test(line[i - 1]))
    ) {
      let j = i;
      while (j < line.length && /[\d.xXa-fA-F_]/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j), color: NUMBER_COLOR });
      i = j;
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);

      if (TS_KEYWORDS.has(word)) {
        tokens.push({ text: word, color: KEYWORD_COLOR });
      } else if (j < line.length && line[j] === "(") {
        tokens.push({ text: word, color: FUNCTION_COLOR });
      } else if (word[0] === word[0].toUpperCase() && /[a-z]/.test(word)) {
        tokens.push({ text: word, color: TYPE_COLOR });
      } else {
        tokens.push({ text: word, color: DEFAULT_COLOR });
      }
      i = j;
      continue;
    }

    // Operators
    if (/[+\-*/<>=!&|^~%?:]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[+\-*/<>=!&|^~%?:]/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j), color: OPERATOR_COLOR });
      i = j;
      continue;
    }

    tokens.push({ text: line[i], color: DEFAULT_COLOR });
    i++;
  }

  // Merge adjacent same-colored tokens to reduce React element count
  const merged: Token[] = [];
  for (const token of tokens) {
    const last = merged[merged.length - 1];
    if (last && last.color === token.color) {
      last.text += token.text;
    } else {
      merged.push({ text: token.text, color: token.color });
    }
  }
  return merged;
}

interface SourceFile {
  name: string;
  lines: string[];
}

function loadSourceFiles(): SourceFile[] {
  const thisDir = dirname(fileURLToPath(import.meta.url));
  // In dev: thisDir is src/screensavers/. In dist: thisDir is dist/screensavers/.
  // Source files live in src/screensavers/ either way.
  const candidates = [thisDir, resolve(thisDir, "../../src/screensavers")];

  for (const dir of candidates) {
    try {
      const files = readdirSync(dir)
        .filter((f) => f.endsWith(".tsx") && f !== "utils.tsx")
        .sort();
      if (files.length === 0) continue;

      return files.map((f) => ({
        name: f,
        lines: readFileSync(join(dir, f), "utf-8").split("\n"),
      }));
    } catch {
      // try next candidate directory
    }
  }

  // Fallback: show this file's own source as a last resort
  return [
    {
      name: "source-code-scroll.tsx",
      lines: ["// Could not locate source files"],
    },
  ];
}

interface ScrollState {
  fileIndex: number;
  scrollOffset: number;
  typingMode: boolean;
  typingLine: number;
  typingCol: number;
  typingDelay: number;
  typingTimer: number;
  allLines: string[];
  allFileNames: string[]; // filename per line (for separator display)
  lineNumberWidth: number;
  prevColumns: number;
  prevRows: number;
}

let cachedFiles: SourceFile[] | null = null;

function getSourceFiles(): SourceFile[] {
  if (!cachedFiles) {
    cachedFiles = loadSourceFiles();
  }
  return cachedFiles;
}

function buildLineBuffer(startFile: number): {
  lines: string[];
  fileNames: string[];
} {
  const files = getSourceFiles();
  const lines: string[] = [];
  const fileNames: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const idx = (startFile + i) % files.length;
    const file = files[idx];

    if (i > 0) {
      lines.push("", `${"─".repeat(40)}`, "");
      fileNames.push("", "", "");
    }

    // File header
    lines.push(`// ${file.name}`);
    fileNames.push(file.name);

    for (const line of file.lines) {
      lines.push(line);
      fileNames.push(file.name);
    }
  }

  return { lines, fileNames };
}

function SourceCodeScroll({ columns, rows, frame }: ScreensaverProps) {
  const stateRef = useRef<ScrollState | null>(null);

  if (
    !stateRef.current ||
    stateRef.current.prevColumns !== columns ||
    stateRef.current.prevRows !== rows
  ) {
    const files = getSourceFiles();
    const startFile = stateRef.current
      ? stateRef.current.fileIndex
      : Math.floor(Math.random() * files.length);
    const { lines, fileNames } = buildLineBuffer(startFile);
    stateRef.current = {
      fileIndex: startFile,
      scrollOffset: 0,
      typingMode: false,
      typingLine: 0,
      typingCol: 0,
      typingDelay: 2,
      typingTimer: 0,
      allLines: lines,
      allFileNames: fileNames,
      lineNumberWidth: 4,
      prevColumns: columns,
      prevRows: rows,
    };
  }

  const state = stateRef.current;
  const contentRows = rows - 1;

  // Occasionally switch to typing mode
  if (!state.typingMode && frame % 200 === 0 && Math.random() < 0.3) {
    state.typingMode = true;
    state.typingLine =
      Math.floor(state.scrollOffset) + Math.floor(contentRows / 2);
    state.typingCol = 0;
    state.typingTimer = 0;
    state.typingDelay = 1 + Math.floor(Math.random() * 3);
  }

  // Advance scroll or typing
  if (state.typingMode) {
    state.typingTimer++;
    if (state.typingTimer >= state.typingDelay) {
      state.typingTimer = 0;
      state.typingCol++;
      const currentLine =
        state.allLines[state.typingLine % state.allLines.length] || "";
      if (state.typingCol >= currentLine.length) {
        state.typingCol = 0;
        state.typingLine++;
        if (
          state.typingLine >
          Math.floor(state.scrollOffset) + Math.floor(contentRows / 2) + 3
        ) {
          state.typingMode = false;
          state.scrollOffset += 0.15;
        }
      }
    }
  } else {
    state.scrollOffset += 0.15;
  }

  // Wrap around when we've scrolled through all lines
  if (state.scrollOffset >= state.allLines.length) {
    const files = getSourceFiles();
    state.fileIndex = (state.fileIndex + 1) % files.length;
    const { lines, fileNames } = buildLineBuffer(state.fileIndex);
    state.allLines = lines;
    state.allFileNames = fileNames;
    state.scrollOffset = 0;
  }

  const lineStart = Math.floor(state.scrollOffset);
  const maxLineNum = lineStart + contentRows;
  state.lineNumberWidth = Math.max(3, String(maxLineNum).length);

  const renderedRows: React.ReactNode[] = [];
  const maxContentWidth = columns - state.lineNumberWidth - 2;

  for (let y = 0; y < contentRows; y++) {
    const lineIdx = (lineStart + y) % state.allLines.length;
    const rawLine = state.allLines[lineIdx];
    const fileName = state.allFileNames[lineIdx];
    const lineNum = lineStart + y + 1;

    let displayLine = rawLine;
    if (
      state.typingMode &&
      lineIdx === state.typingLine % state.allLines.length
    ) {
      displayLine = rawLine.slice(0, state.typingCol);
    } else if (
      state.typingMode &&
      lineIdx > state.typingLine % state.allLines.length &&
      lineIdx <= (state.typingLine % state.allLines.length) + 3 &&
      lineStart + y > state.typingLine
    ) {
      displayLine = "";
    }

    if (displayLine.length > maxContentWidth) {
      displayLine = displayLine.slice(0, maxContentWidth);
    }

    const segments: React.ReactNode[] = [];

    const numStr = String(lineNum).padStart(state.lineNumberWidth, " ");
    segments.push(
      <Text key="ln" color={LINE_NUM_COLOR}>
        {numStr}{" "}
      </Text>,
    );

    if (!fileName && rawLine.includes("─")) {
      segments.push(
        <Text key="sep" color={COMMENT_COLOR}>
          {displayLine}
        </Text>,
      );
    } else if (displayLine.length === 0) {
      // empty line
    } else {
      const tokens = tokenizeLine(displayLine);
      for (let t = 0; t < tokens.length; t++) {
        segments.push(
          <Text key={t} color={tokens[t].color}>
            {tokens[t].text}
          </Text>,
        );
      }
    }

    if (
      state.typingMode &&
      lineIdx === state.typingLine % state.allLines.length
    ) {
      segments.push(
        <Text key="cursor" color="#ffffff" bold>
          {frame % 10 < 5 ? "▊" : " "}
        </Text>,
      );
    }

    renderedRows.push(<Box key={y}>{segments}</Box>);
  }

  return <Box flexDirection="column">{renderedRows}</Box>;
}

export const sourceCodeScroll: ScreensaverModule = {
  name: "source-code-scroll",
  description:
    "Syntax-highlighted source code scrolling by like a Hollywood hacking scene",
  component: SourceCodeScroll,
  fps: 20,
};
