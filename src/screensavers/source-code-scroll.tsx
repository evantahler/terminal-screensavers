import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

// Syntax highlighting colors
const KEYWORD_COLOR = "#c678dd"; // purple
const STRING_COLOR = "#98c379"; // green
const COMMENT_COLOR = "#5c6370"; // gray
const NUMBER_COLOR = "#d19a66"; // orange
const FUNCTION_COLOR = "#61afef"; // blue
const TYPE_COLOR = "#e5c07b"; // yellow
const OPERATOR_COLOR = "#56b6c2"; // cyan
const DEFAULT_COLOR = "#abb2bf"; // light gray
const LINE_NUM_COLOR = "#4b5263"; // dark gray

interface Token {
  text: string;
  color: string;
}

interface CodeSnippet {
  language: string;
  lines: string[];
}

const CODE_SNIPPETS: CodeSnippet[] = [
  {
    language: "JavaScript",
    lines: [
      "// QuickSort implementation",
      "function quickSort(arr, low = 0, high = arr.length - 1) {",
      "  if (low < high) {",
      "    const pivotIndex = partition(arr, low, high);",
      "    quickSort(arr, low, pivotIndex - 1);",
      "    quickSort(arr, pivotIndex + 1, high);",
      "  }",
      "  return arr;",
      "}",
      "",
      "function partition(arr, low, high) {",
      "  const pivot = arr[high];",
      "  let i = low - 1;",
      "",
      "  for (let j = low; j < high; j++) {",
      "    if (arr[j] <= pivot) {",
      "      i++;",
      "      [arr[i], arr[j]] = [arr[j], arr[i]];",
      "    }",
      "  }",
      "",
      "  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];",
      "  return i + 1;",
      "}",
      "",
      "const data = [38, 27, 43, 3, 9, 82, 10];",
      'console.log("Sorted:", quickSort(data));',
    ],
  },
  {
    language: "Python",
    lines: [
      "# Binary search tree implementation",
      "class Node:",
      "    def __init__(self, value):",
      "        self.value = value",
      "        self.left = None",
      "        self.right = None",
      "",
      "class BinarySearchTree:",
      "    def __init__(self):",
      "        self.root = None",
      "",
      "    def insert(self, value):",
      "        if not self.root:",
      "            self.root = Node(value)",
      "            return",
      "        self._insert_recursive(self.root, value)",
      "",
      "    def _insert_recursive(self, node, value):",
      "        if value < node.value:",
      "            if node.left is None:",
      "                node.left = Node(value)",
      "            else:",
      "                self._insert_recursive(node.left, value)",
      "        else:",
      "            if node.right is None:",
      "                node.right = Node(value)",
      "            else:",
      "                self._insert_recursive(node.right, value)",
      "",
      "    def search(self, value):",
      "        return self._search_recursive(self.root, value)",
      "",
      "    def _search_recursive(self, node, value):",
      "        if node is None or node.value == value:",
      "            return node",
      "        if value < node.value:",
      "            return self._search_recursive(node.left, value)",
      "        return self._search_recursive(node.right, value)",
    ],
  },
  {
    language: "Rust",
    lines: [
      "// Fibonacci with memoization",
      "use std::collections::HashMap;",
      "",
      "fn fibonacci(n: u64, memo: &mut HashMap<u64, u64>) -> u64 {",
      "    if n <= 1 {",
      "        return n;",
      "    }",
      "    if let Some(&result) = memo.get(&n) {",
      "        return result;",
      "    }",
      "    let result = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);",
      "    memo.insert(n, result);",
      "    result",
      "}",
      "",
      "fn main() {",
      "    let mut memo = HashMap::new();",
      "    for i in 0..40 {",
      '        println!("fib({}) = {}", i, fibonacci(i, &mut memo));',
      "    }",
      "}",
    ],
  },
  {
    language: "Go",
    lines: [
      "// HTTP server with middleware",
      "package main",
      "",
      "import (",
      '    "fmt"',
      '    "log"',
      '    "net/http"',
      '    "time"',
      ")",
      "",
      "func loggingMiddleware(next http.Handler) http.Handler {",
      "    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {",
      "        start := time.Now()",
      "        next.ServeHTTP(w, r)",
      '        log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))',
      "    })",
      "}",
      "",
      "func helloHandler(w http.ResponseWriter, r *http.Request) {",
      '    fmt.Fprintf(w, "Hello, World!")',
      "}",
      "",
      "func main() {",
      "    mux := http.NewServeMux()",
      '    mux.HandleFunc("/", helloHandler)',
      "",
      "    server := &http.Server{",
      '        Addr:         ":8080",',
      "        Handler:      loggingMiddleware(mux),",
      "        ReadTimeout:  5 * time.Second,",
      "        WriteTimeout: 10 * time.Second,",
      "    }",
      "",
      '    log.Println("Server starting on :8080")',
      "    log.Fatal(server.ListenAndServe())",
      "}",
    ],
  },
  {
    language: "TypeScript",
    lines: [
      "// Event emitter with generics",
      "type EventMap = Record<string, unknown[]>;",
      "",
      "class TypedEmitter<Events extends EventMap> {",
      "  private listeners = new Map<",
      "    keyof Events,",
      "    Set<(...args: unknown[]) => void>",
      "  >();",
      "",
      "  on<K extends keyof Events>(",
      "    event: K,",
      "    listener: (...args: Events[K]) => void,",
      "  ): this {",
      "    if (!this.listeners.has(event)) {",
      "      this.listeners.set(event, new Set());",
      "    }",
      "    this.listeners.get(event)!.add(listener as never);",
      "    return this;",
      "  }",
      "",
      "  emit<K extends keyof Events>(event: K, ...args: Events[K]): boolean {",
      "    const handlers = this.listeners.get(event);",
      "    if (!handlers?.size) return false;",
      "    for (const handler of handlers) {",
      "      handler(...args);",
      "    }",
      "    return true;",
      "  }",
      "}",
      "",
      "// Usage",
      "interface AppEvents extends EventMap {",
      "  login: [user: string, timestamp: number];",
      "  error: [message: string, code: number];",
      "}",
      "",
      "const emitter = new TypedEmitter<AppEvents>();",
      'emitter.on("login", (user, ts) => {',
      "  console.log(`${user} logged in at ${new Date(ts)}`);",
      "});",
    ],
  },
  {
    language: "C",
    lines: [
      "/* Linked list implementation */",
      "#include <stdio.h>",
      "#include <stdlib.h>",
      "",
      "typedef struct Node {",
      "    int data;",
      "    struct Node* next;",
      "} Node;",
      "",
      "Node* createNode(int data) {",
      "    Node* newNode = (Node*)malloc(sizeof(Node));",
      "    newNode->data = data;",
      "    newNode->next = NULL;",
      "    return newNode;",
      "}",
      "",
      "void insertFront(Node** head, int data) {",
      "    Node* newNode = createNode(data);",
      "    newNode->next = *head;",
      "    *head = newNode;",
      "}",
      "",
      "void printList(Node* head) {",
      "    Node* current = head;",
      "    while (current != NULL) {",
      '        printf("%d -> ", current->data);',
      "        current = current->next;",
      "    }",
      '    printf("NULL\\n");',
      "}",
      "",
      "void freeList(Node* head) {",
      "    Node* temp;",
      "    while (head != NULL) {",
      "        temp = head;",
      "        head = head->next;",
      "        free(temp);",
      "    }",
      "}",
    ],
  },
  {
    language: "Python",
    lines: [
      "# A* pathfinding algorithm",
      "import heapq",
      "",
      "def heuristic(a, b):",
      "    return abs(a[0] - b[0]) + abs(a[1] - b[1])",
      "",
      "def astar(grid, start, goal):",
      "    rows, cols = len(grid), len(grid[0])",
      "    open_set = [(0, start)]",
      "    came_from = {}",
      "    g_score = {start: 0}",
      "    f_score = {start: heuristic(start, goal)}",
      "",
      "    while open_set:",
      "        _, current = heapq.heappop(open_set)",
      "",
      "        if current == goal:",
      "            path = []",
      "            while current in came_from:",
      "                path.append(current)",
      "                current = came_from[current]",
      "            path.append(start)",
      "            return path[::-1]",
      "",
      "        for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:",
      "            nx, ny = current[0] + dx, current[1] + dy",
      "            if 0 <= nx < rows and 0 <= ny < cols:",
      "                if grid[nx][ny] == 1:",
      "                    continue",
      "                tentative = g_score[current] + 1",
      "                neighbor = (nx, ny)",
      "                if tentative < g_score.get(neighbor, float('inf')):",
      "                    came_from[neighbor] = current",
      "                    g_score[neighbor] = tentative",
      "                    f = tentative + heuristic(neighbor, goal)",
      "                    f_score[neighbor] = f",
      "                    heapq.heappush(open_set, (f, neighbor))",
      "",
      "    return None  # No path found",
    ],
  },
  {
    language: "Rust",
    lines: [
      "// Thread-safe reference counting",
      "use std::sync::{Arc, Mutex};",
      "use std::thread;",
      "",
      "struct SharedState {",
      "    counter: i32,",
      "    messages: Vec<String>,",
      "}",
      "",
      "fn main() {",
      "    let state = Arc::new(Mutex::new(SharedState {",
      "        counter: 0,",
      "        messages: Vec::new(),",
      "    }));",
      "",
      "    let mut handles = vec![];",
      "",
      "    for i in 0..10 {",
      "        let state = Arc::clone(&state);",
      "        let handle = thread::spawn(move || {",
      "            let mut data = state.lock().unwrap();",
      "            data.counter += 1;",
      '            data.messages.push(format!("Thread {} done", i));',
      "        });",
      "        handles.push(handle);",
      "    }",
      "",
      "    for handle in handles {",
      "        handle.join().unwrap();",
      "    }",
      "",
      "    let final_state = state.lock().unwrap();",
      '    println!("Counter: {}", final_state.counter);',
      "    for msg in &final_state.messages {",
      '        println!("{}", msg);',
      "    }",
      "}",
    ],
  },
];

// Language-specific keyword sets for syntax highlighting
const JS_KEYWORDS = new Set([
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
]);

const PYTHON_KEYWORDS = new Set([
  "def",
  "class",
  "if",
  "else",
  "elif",
  "for",
  "while",
  "return",
  "import",
  "from",
  "None",
  "True",
  "False",
  "not",
  "and",
  "or",
  "in",
  "is",
  "self",
  "with",
  "as",
  "try",
  "except",
  "raise",
  "pass",
  "continue",
  "break",
  "yield",
  "lambda",
]);

const RUST_KEYWORDS = new Set([
  "fn",
  "let",
  "mut",
  "if",
  "else",
  "for",
  "while",
  "return",
  "use",
  "struct",
  "impl",
  "pub",
  "mod",
  "match",
  "enum",
  "trait",
  "move",
  "unsafe",
  "where",
  "type",
  "self",
  "super",
  "crate",
  "loop",
  "break",
  "continue",
  "const",
  "static",
  "ref",
  "in",
]);

const GO_KEYWORDS = new Set([
  "func",
  "package",
  "import",
  "var",
  "const",
  "if",
  "else",
  "for",
  "range",
  "return",
  "type",
  "struct",
  "interface",
  "map",
  "chan",
  "go",
  "defer",
  "select",
  "case",
  "switch",
  "default",
  "break",
  "continue",
  "nil",
]);

const C_KEYWORDS = new Set([
  "int",
  "char",
  "void",
  "float",
  "double",
  "if",
  "else",
  "for",
  "while",
  "return",
  "struct",
  "typedef",
  "include",
  "define",
  "NULL",
  "sizeof",
  "static",
  "const",
  "unsigned",
  "long",
  "short",
  "enum",
  "union",
  "switch",
  "case",
  "break",
  "continue",
]);

const TS_KEYWORDS = new Set([
  ...JS_KEYWORDS,
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
]);

function getKeywords(language: string): Set<string> {
  switch (language) {
    case "JavaScript":
      return JS_KEYWORDS;
    case "Python":
      return PYTHON_KEYWORDS;
    case "Rust":
      return RUST_KEYWORDS;
    case "Go":
      return GO_KEYWORDS;
    case "C":
      return C_KEYWORDS;
    case "TypeScript":
      return TS_KEYWORDS;
    default:
      return JS_KEYWORDS;
  }
}

function tokenizeLine(line: string, language: string): Token[] {
  const keywords = getKeywords(language);
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Comments
    if (line[i] === "/" && line[i + 1] === "/") {
      tokens.push({ text: line.slice(i), color: COMMENT_COLOR });
      return tokens;
    }
    if (line[i] === "/" && line[i + 1] === "*") {
      const end = line.indexOf("*/", i + 2);
      const commentEnd = end >= 0 ? end + 2 : line.length;
      tokens.push({ text: line.slice(i, commentEnd), color: COMMENT_COLOR });
      i = commentEnd;
      continue;
    }
    if (line[i] === "#" && (language === "Python" || language === "C")) {
      tokens.push({ text: line.slice(i), color: COMMENT_COLOR });
      return tokens;
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
    if (/[a-zA-Z_]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
      const word = line.slice(i, j);

      if (keywords.has(word)) {
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

    // Other characters (brackets, punctuation, spaces)
    tokens.push({ text: line[i], color: DEFAULT_COLOR });
    i++;
  }

  // Merge adjacent tokens with the same color to reduce React element count
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

interface ScrollState {
  snippetIndex: number;
  scrollOffset: number; // fractional line offset for smooth scrolling
  typingMode: boolean;
  typingLine: number;
  typingCol: number;
  typingDelay: number; // frames between characters
  typingTimer: number;
  allLines: string[]; // flattened lines from current and future snippets
  allLanguages: string[]; // language per line
  lineNumberWidth: number;
  prevColumns: number;
  prevRows: number;
}

function buildLineBuffer(startSnippet: number): {
  lines: string[];
  languages: string[];
} {
  const lines: string[] = [];
  const languages: string[] = [];

  for (let i = 0; i < CODE_SNIPPETS.length; i++) {
    const idx = (startSnippet + i) % CODE_SNIPPETS.length;
    const snippet = CODE_SNIPPETS[idx];

    // Add separator between snippets
    if (i > 0) {
      lines.push("");
      languages.push("");
      lines.push(`${"─".repeat(40)}`);
      languages.push("");
      lines.push("");
      languages.push("");
    }

    for (const line of snippet.lines) {
      lines.push(line);
      languages.push(snippet.language);
    }
  }

  return { lines, languages };
}

function SourceCodeScroll({ columns, rows, frame }: ScreensaverProps) {
  const stateRef = useRef<ScrollState | null>(null);

  if (
    !stateRef.current ||
    stateRef.current.prevColumns !== columns ||
    stateRef.current.prevRows !== rows
  ) {
    const startSnippet = stateRef.current
      ? stateRef.current.snippetIndex
      : Math.floor(Math.random() * CODE_SNIPPETS.length);
    const { lines, languages } = buildLineBuffer(startSnippet);
    stateRef.current = {
      snippetIndex: startSnippet,
      scrollOffset: 0,
      typingMode: false,
      typingLine: 0,
      typingCol: 0,
      typingDelay: 2,
      typingTimer: 0,
      allLines: lines,
      allLanguages: languages,
      lineNumberWidth: 4,
      prevColumns: columns,
      prevRows: rows,
    };
  }

  const state = stateRef.current;
  const contentRows = rows - 1;

  // Every ~200 frames, maybe switch to typing mode
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
        // End typing mode after a few lines
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
    state.snippetIndex = (state.snippetIndex + 1) % CODE_SNIPPETS.length;
    const { lines, languages } = buildLineBuffer(state.snippetIndex);
    state.allLines = lines;
    state.allLanguages = languages;
    state.scrollOffset = 0;
  }

  const lineStart = Math.floor(state.scrollOffset);
  const maxLineNum = lineStart + contentRows;
  state.lineNumberWidth = Math.max(3, String(maxLineNum).length);

  const renderedRows: React.ReactNode[] = [];
  const maxContentWidth = columns - state.lineNumberWidth - 2; // line num + space + separator

  for (let y = 0; y < contentRows; y++) {
    const lineIdx = (lineStart + y) % state.allLines.length;
    const rawLine = state.allLines[lineIdx];
    const language = state.allLanguages[lineIdx];
    const lineNum = lineStart + y + 1;

    // In typing mode, truncate the line being typed
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

    // Truncate to fit screen width
    if (displayLine.length > maxContentWidth) {
      displayLine = displayLine.slice(0, maxContentWidth);
    }

    const segments: React.ReactNode[] = [];

    // Line number
    const numStr = String(lineNum).padStart(state.lineNumberWidth, " ");
    segments.push(
      <Text key="ln" color={LINE_NUM_COLOR}>
        {numStr}{" "}
      </Text>,
    );

    // Separator lines
    if (!language && rawLine.includes("─")) {
      segments.push(
        <Text key="sep" color={COMMENT_COLOR}>
          {displayLine}
        </Text>,
      );
    } else if (displayLine.length === 0) {
      // empty line, nothing to add
    } else {
      // Syntax-highlighted tokens
      const tokens = tokenizeLine(displayLine, language);
      for (let t = 0; t < tokens.length; t++) {
        segments.push(
          <Text key={t} color={tokens[t].color}>
            {tokens[t].text}
          </Text>,
        );
      }
    }

    // Typing cursor
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
