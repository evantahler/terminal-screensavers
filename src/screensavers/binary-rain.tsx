import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

const WORDS = [
  "root",
  "sudo",
  "chmod",
  "grep",
  "stdin",
  "null",
  "void",
  "fork",
  "exec",
  "init",
  "bash",
  "pipe",
  "argv",
  "heap",
  "stack",
  "mutex",
  "tcp",
  "udp",
  "ssh",
  "ssl",
  "http",
  "dns",
  "ping",
  "node",
  "kern",
  "proc",
  "/dev",
  "/tmp",
  "/etc",
  "/bin",
  "/var",
  "0xff",
  "0x00",
  "127.0.0.1",
  "10.0.0.1",
  "192.168",
  "::1",
  "404",
  "200",
  "port",
  "sock",
  "eth0",
  "lo0",
  "sbin",
  "usr",
  "lib",
  "src",
  "EOF",
  "PID",
  "UID",
  "TTY",
  "SYN",
  "ACK",
  "FIN",
  "RST",
];

function randomBit(): string {
  return Math.random() < 0.5 ? "0" : "1";
}

interface Drop {
  y: number;
  speed: number;
  length: number;
  chars: string[];
}

function BinaryRain({ columns, rows }: ScreensaverProps) {
  const dropsRef = useRef<Map<number, Drop>>(new Map());
  const drops = dropsRef.current;

  const contentRows = rows - 1;

  // Initialize or respawn drops — denser than matrix rain
  for (let x = 0; x < columns; x++) {
    const drop = drops.get(x);
    if (!drop || drop.y - drop.length > contentRows) {
      if (!drop || Math.random() < 0.05) {
        const length = 8 + Math.floor(Math.random() * 25);
        const chars: string[] = [];

        // Build the column's character array, occasionally embedding a word
        let i = 0;
        while (i < contentRows + 30) {
          if (Math.random() < 0.03) {
            const word = WORDS[Math.floor(Math.random() * WORDS.length)];
            for (const ch of word) {
              chars.push(ch);
              i++;
            }
          } else {
            chars.push(randomBit());
            i++;
          }
        }

        drops.set(x, {
          y: -Math.floor(Math.random() * contentRows),
          speed: 0.3 + Math.random() * 0.8,
          length,
          chars,
        });
      }
    }
  }

  const lines: React.ReactNode[] = [];

  for (let y = 0; y < contentRows; y++) {
    const row: (SparseCell | null)[] = [];
    for (let x = 0; x < columns; x++) {
      const drop = drops.get(x);
      if (!drop) {
        row.push(null);
        continue;
      }

      const headY = Math.floor(drop.y);
      const dist = headY - y;

      if (dist < 0 || dist >= drop.length) {
        row.push(null);
      } else {
        const ch = drop.chars[y % drop.chars.length];
        const isWordChar = ch !== "0" && ch !== "1";

        if (dist === 0) {
          row.push({ char: ch, color: "white", bold: true });
        } else if (dist < 3) {
          row.push({
            char: ch,
            color: isWordChar ? "#66ffaa" : "#00ff00",
            bold: isWordChar,
          });
        } else {
          const brightness = Math.max(0, 1 - dist / drop.length);
          const green = Math.floor(60 + brightness * 195);
          const blue = isWordChar ? Math.floor(20 + brightness * 40) : 0;
          row.push({
            char: ch,
            color: `#00${green.toString(16).padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`,
          });
        }
      }
    }
    lines.push(renderSparseRow(row, y));
  }

  // Advance drops and mutate characters
  for (const [, drop] of drops) {
    drop.y += drop.speed;
    // Randomly flip bits (but not embedded word chars)
    if (Math.random() < 0.15) {
      const idx = Math.floor(Math.random() * drop.chars.length);
      const ch = drop.chars[idx];
      if (ch === "0" || ch === "1") {
        drop.chars[idx] = randomBit();
      }
    }
  }

  return <Box flexDirection="column">{lines}</Box>;
}

export const binaryRain: ScreensaverModule = {
  name: "binary-rain",
  description:
    "Falling binary digits with embedded tech words and IP addresses",
  component: BinaryRain,
  fps: 14,
};
