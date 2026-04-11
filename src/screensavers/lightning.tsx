import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { renderSparseRow } from "./utils.js";

interface BoltSegment {
	x: number;
	y: number;
	char: string;
	brightness: number; // 0-1, fades over time
}

interface LightningBolt {
	segments: BoltSegment[];
	birthFrame: number;
	flashFrames: number; // how many frames the initial flash lasts
	fadeFrames: number; // how many frames the afterimage lasts
}

interface State {
	bolts: LightningBolt[];
	nextStrikeFrame: number;
	clouds: { x: number; width: number }[];
	initialized: boolean;
}

const FLASH_DURATION = 3;
const FADE_DURATION = 12;
const BOLT_CHARS = ["|", "\\", "/", "│", "╲", "╱"];

// Blue-white palette from brightest to dimmest
const BOLT_COLORS = [
	"#ffffff",
	"#eeeeff",
	"#ccccff",
	"#aaaaee",
	"#8888dd",
	"#6666bb",
	"#444488",
	"#333366",
];

const FLASH_COLOR = "#1a1a3a";
const CLOUD_COLOR = "#555577";
const CLOUD_BRIGHT = "#7777aa";

function generateBolt(
	startX: number,
	columns: number,
	rows: number,
): BoltSegment[] {
	const segments: BoltSegment[] = [];
	const contentRows = rows - 1;
	const cloudHeight = 3;

	// Midpoint displacement: start at top, zigzag down
	let x = startX;

	for (let y = cloudHeight; y < contentRows; y++) {
		// Random horizontal displacement
		const drift = Math.random() < 0.5 ? -1 : 1;
		if (Math.random() < 0.4) {
			x += drift;
		}
		x = Math.max(1, Math.min(columns - 2, x));

		// Choose character based on drift direction
		let char: string;
		if (Math.random() < 0.15 && y > cloudHeight + 2) {
			// Occasionally use a thicker character
			char = "█";
		} else {
			const prevX =
				segments.length > 0 ? segments[segments.length - 1].x : startX;
			if (x > prevX) char = "\\";
			else if (x < prevX) char = "/";
			else char = "│";
		}

		segments.push({ x, y, char, brightness: 1 });

		// Branch off occasionally
		if (Math.random() < 0.15 && y > cloudHeight + 3 && y < contentRows - 5) {
			const branchDir = Math.random() < 0.5 ? -1 : 1;
			let bx = x;
			const branchLen = 3 + Math.floor(Math.random() * 6);
			for (let b = 0; b < branchLen; b++) {
				bx += branchDir;
				const by = y + b;
				if (by >= contentRows || bx < 0 || bx >= columns) break;
				const bChar = branchDir > 0 ? "\\" : "/";
				segments.push({ x: bx, y: by, char: bChar, brightness: 0.7 });
			}
		}
	}

	return segments;
}

function generateClouds(columns: number): { x: number; width: number }[] {
	const clouds: { x: number; width: number }[] = [];
	let cx = 0;
	while (cx < columns) {
		const gap = Math.floor(Math.random() * 8);
		cx += gap;
		const width = 6 + Math.floor(Math.random() * 12);
		if (cx + width < columns) {
			clouds.push({ x: cx, width });
		}
		cx += width;
	}
	return clouds;
}

function getNextStrikeDelay(): number {
	// 2-8 seconds at 15fps = 30-120 frames
	return 30 + Math.floor(Math.random() * 90);
}

const Lightning: React.FC<ScreensaverProps> = ({
	columns,
	rows,
	frame,
	elapsed,
}) => {
	const stateRef = useRef<State>({
		bolts: [],
		nextStrikeFrame: 15, // first strike after ~1 second
		clouds: [],
		initialized: false,
	});

	const state = stateRef.current;

	if (!state.initialized || state.clouds.length === 0) {
		state.clouds = generateClouds(columns);
		state.initialized = true;
	}

	// Spawn new bolts
	if (frame >= state.nextStrikeFrame) {
		const boltCount = Math.random() < 0.2 ? 2 : 1; // 20% chance of double strike
		for (let i = 0; i < boltCount; i++) {
			const startX =
				Math.floor(Math.random() * (columns - 4)) + 2;
			const segments = generateBolt(startX, columns, rows);
			state.bolts.push({
				segments,
				birthFrame: frame,
				flashFrames: FLASH_DURATION,
				fadeFrames: FADE_DURATION,
			});
		}
		state.nextStrikeFrame = frame + getNextStrikeDelay();
	}

	// Determine if any bolt is in flash phase
	let flashIntensity = 0;
	for (const bolt of state.bolts) {
		const age = frame - bolt.birthFrame;
		if (age < bolt.flashFrames) {
			const intensity = 1 - age / bolt.flashFrames;
			flashIntensity = Math.max(flashIntensity, intensity);
		}
	}

	// Build grid
	const contentRows = rows - 1;
	const grid: Array<Array<{ char: string; color: string; bold?: boolean } | null>> =
		Array.from({ length: contentRows }, () => Array(columns).fill(null));

	// Render clouds (top 3 rows)
	for (const cloud of state.clouds) {
		for (let dx = 0; dx < cloud.width; dx++) {
			const cx = cloud.x + dx;
			if (cx >= 0 && cx < columns) {
				// Row 0: top of cloud
				if (dx > 1 && dx < cloud.width - 2 && 0 < contentRows) {
					grid[0][cx] = {
						char: "░",
						color: flashIntensity > 0.5 ? CLOUD_BRIGHT : CLOUD_COLOR,
					};
				}
				// Row 1: middle of cloud
				if (1 < contentRows) {
					grid[1][cx] = {
						char: "▓",
						color: flashIntensity > 0.3 ? CLOUD_BRIGHT : CLOUD_COLOR,
					};
				}
				// Row 2: bottom of cloud
				if (dx > 0 && dx < cloud.width - 1 && 2 < contentRows) {
					grid[2][cx] = {
						char: "░",
						color: flashIntensity > 0.5 ? CLOUD_BRIGHT : CLOUD_COLOR,
					};
				}
			}
		}
	}

	// Flash background effect
	if (flashIntensity > 0.3) {
		for (let y = 0; y < contentRows; y++) {
			for (let x = 0; x < columns; x++) {
				if (!grid[y][x]) {
					grid[y][x] = { char: " ", color: FLASH_COLOR };
				}
			}
		}
	}

	// Render bolts
	const activeBolts: LightningBolt[] = [];
	for (const bolt of state.bolts) {
		const age = frame - bolt.birthFrame;
		const totalLife = bolt.flashFrames + bolt.fadeFrames;

		if (age >= totalLife) continue;
		activeBolts.push(bolt);

		for (const seg of bolt.segments) {
			if (seg.y < 0 || seg.y >= contentRows || seg.x < 0 || seg.x >= columns)
				continue;

			let colorIdx: number;
			let bold = false;

			if (age < bolt.flashFrames) {
				// Flash phase: bright white
				colorIdx = 0;
				bold = true;
			} else {
				// Fade phase
				const fadeProgress = (age - bolt.flashFrames) / bolt.fadeFrames;
				const adjustedFade = fadeProgress / Math.max(seg.brightness, 0.1);
				colorIdx = Math.min(
					BOLT_COLORS.length - 1,
					Math.floor(adjustedFade * BOLT_COLORS.length),
				);
			}

			grid[seg.y][seg.x] = {
				char: seg.char,
				color: BOLT_COLORS[colorIdx],
				bold,
			};
		}
	}
	state.bolts = activeBolts;

	return (
		<Box flexDirection="column">
			{grid.map((row, y) => renderSparseRow(row, y))}
		</Box>
	);
};

export const lightning: ScreensaverModule = {
	name: "lightning",
	description:
		"Procedural lightning bolts striking from storm clouds with bright flashes",
	component: Lightning,
	fps: 15,
};
