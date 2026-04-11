import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

const SYMBOLS = [
  "ACME",
  "BNCE",
  "CHRL",
  "CYBR",
  "DNDE",
  "DRKN",
  "FTHR",
  "GLOB",
  "GTHM",
  "HOPR",
  "INIT",
  "LXCR",
  "MCRN",
  "NABU",
  "OMCP",
  "OSCR",
  "PCFK",
  "RECP",
  "SLRN",
  "SNKE",
  "STRK",
  "TYNL",
  "UBIK",
  "UMRL",
  "VEXR",
  "WAYN",
  "WEYL",
  "WTSN",
  "XNDR",
  "YOYO",
];

const HEADLINES = [
  "STARK INDUSTRIES UNVEILS ARC REACTOR V3",
  "WAYNE ENTERPRISES ACQUIRES LEXCORP ROBOTICS DIV",
  "UMBRELLA CORP DENIES LAB LEAK ALLEGATIONS",
  "WEYLAND-YUTANI COLONY SHIPS AHEAD OF SCHEDULE",
  "TYRELL CORP NEXUS-7 PASSES VOIGHT-KAMPFF TEST",
  "ACME CORP RECALL EXPANDS TO ALL ROCKET SKATES",
  "CYBERDYNE SYSTEMS IPO PRICES ABOVE RANGE",
  "OSCORP SPIDER-SILK FIBER BEATS KEVLAR IN TRIALS",
  "INITECH REPORTS RECORD TPS REPORT OUTPUT",
  "SOYLENT INDUSTRIES EXPANDS TO EUROPEAN MARKETS",
  "GLOBEX CORP HAMMOCK DISTRICT PLAN APPROVED",
  "NAKATOMI TRADING POSTS STRONG Q3 EARNINGS",
  "MASSIVE DYNAMIC OPENS NEW RESEARCH CAMPUS",
  "REKALL INC MEMORY IMPLANT SALES SURGE 40%",
  "APERTURE SCIENCE PORTAL TECH CLEARS SAFETY REVIEW",
  "MOMCORP ACQUIRES PLANET EXPRESS FOR $8B",
  "WONKA INDUSTRIES GOLDEN TICKET EVENT DRIVES BUZZ",
  "CHOAM SPICE FUTURES HIT ALL-TIME HIGH",
  "SPACELY SPROCKETS BEATS COGSWELL IN MARKET SHARE",
  "GENCO PURA OLIVE OIL EXPANDS IMPORT OPERATIONS",
];

const SEPARATOR = " ● ";

interface TickerItem {
  text: string;
  color: string;
  bold: boolean;
}

function generateStockItem(): TickerItem[] {
  const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const price = (50 + Math.random() * 450).toFixed(2);
  const isUp = Math.random() > 0.4;
  const changeVal = (isUp ? 1 : -1) * (Math.random() * 8 + 0.01);
  const pctVal = (isUp ? 1 : -1) * (Math.random() * 5 + 0.01);
  const change = changeVal.toFixed(2);
  const pct = pctVal.toFixed(2);
  const arrow = isUp ? "▲" : "▼";
  const sign = isUp ? "+" : "";
  const color = isUp ? "#00cc66" : "#ff4444";

  return [
    { text: symbol, color: "#ffffff", bold: true },
    { text: ` ${price} `, color: "#cccccc", bold: false },
    {
      text: `${arrow}${sign}${change} (${sign}${pct}%)`,
      color,
      bold: false,
    },
  ];
}

function generateHeadlineItem(): TickerItem[] {
  const headline = HEADLINES[Math.floor(Math.random() * HEADLINES.length)];
  return [{ text: headline, color: "#ffcc00", bold: false }];
}

function generateTickerContent(width: number): TickerItem[] {
  const items: TickerItem[] = [];
  let totalLen = 0;
  const targetLen = width * 3;

  while (totalLen < targetLen) {
    if (items.length > 0) {
      items.push({ text: SEPARATOR, color: "#555555", bold: false });
      totalLen += SEPARATOR.length;
    }

    if (Math.random() < 0.75) {
      const stock = generateStockItem();
      for (const s of stock) {
        items.push(s);
        totalLen += s.text.length;
      }
    } else {
      const headline = generateHeadlineItem();
      for (const h of headline) {
        items.push(h);
        totalLen += h.text.length;
      }
    }
  }

  return items;
}

function flattenToString(items: TickerItem[]): string {
  return items.map((i) => i.text).join("");
}

interface TickerRow {
  items: TickerItem[];
  fullText: string;
  offset: number;
  speed: number;
  y: number;
}

interface TickerState {
  rows: TickerRow[];
  lastColumns: number;
  lastRows: number;
}

function initRows(columns: number, rows: number): TickerRow[] {
  const numTickers = Math.max(1, Math.min(6, Math.floor(rows / 4)));
  const spacing = Math.floor(rows / (numTickers + 1));
  const tickerRows: TickerRow[] = [];

  for (let i = 0; i < numTickers; i++) {
    const items = generateTickerContent(columns);
    tickerRows.push({
      items,
      fullText: flattenToString(items),
      offset: 0,
      speed: 0.5 + Math.random() * 1.5,
      y: spacing * (i + 1),
    });
  }

  return tickerRows;
}

function buildTickerCells(
  ticker: TickerRow,
  columns: number,
): (SparseCell | null)[] {
  const { items, offset } = ticker;
  const totalLen = ticker.fullText.length;
  const startIdx = Math.floor(offset) % totalLen;

  const cells: (SparseCell | null)[] = new Array(columns).fill(null);
  let rendered = 0;

  // Find which item and position the startIdx falls into
  let itemIdx = 0;
  let posInItem = 0;
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    if (acc + items[i].text.length > startIdx) {
      itemIdx = i;
      posInItem = startIdx - acc;
      break;
    }
    acc += items[i].text.length;
  }

  let currentItem = itemIdx;
  let currentPos = posInItem;

  while (rendered < columns) {
    const item = items[currentItem % items.length];
    const remaining = item.text.length - currentPos;
    const take = Math.min(remaining, columns - rendered);

    for (let i = 0; i < take; i++) {
      cells[rendered + i] = {
        char: item.text[currentPos + i],
        color: item.color,
        bold: item.bold,
      };
    }

    rendered += take;
    currentPos += take;

    if (currentPos >= item.text.length) {
      currentItem++;
      currentPos = 0;
    }
  }

  return cells;
}

function TickerTape({ columns, rows }: ScreensaverProps) {
  const stateRef = useRef<TickerState | null>(null);

  if (
    !stateRef.current ||
    stateRef.current.lastColumns !== columns ||
    stateRef.current.lastRows !== rows
  ) {
    stateRef.current = {
      rows: initRows(columns, rows),
      lastColumns: columns,
      lastRows: rows,
    };
  }

  const state = stateRef.current;

  // Advance offsets
  for (const ticker of state.rows) {
    ticker.offset += ticker.speed;
    if (ticker.offset >= ticker.fullText.length) {
      // Regenerate content when we've scrolled through everything
      ticker.items = generateTickerContent(columns);
      ticker.fullText = flattenToString(ticker.items);
      ticker.offset = 0;
      ticker.speed = 0.5 + Math.random() * 1.5;
    }
  }

  // Build output lines
  const tickerYMap = new Map(state.rows.map((t) => [t.y, t]));
  const emptyRow: (SparseCell | null)[] = new Array(columns).fill(null);
  const borderRow: (SparseCell | null)[] = Array.from(
    { length: columns },
    () => ({ char: "─", color: "#333333" }),
  );
  const lines: React.ReactNode[] = [];

  for (let y = 0; y < rows - 1; y++) {
    const ticker = tickerYMap.get(y);
    if (ticker) {
      if (y > 0) {
        lines.push(renderSparseRow(borderRow, y * 1000));
      }
      lines.push(renderSparseRow(buildTickerCells(ticker, columns), y));
    } else {
      lines.push(renderSparseRow(emptyRow, y));
    }
  }

  return <Box flexDirection="column">{lines}</Box>;
}

export const tickerTape: ScreensaverModule = {
  name: "ticker-tape",
  description:
    "Scrolling stock tickers and news headlines with color-coded prices",
  component: TickerTape,
  fps: 20,
};
