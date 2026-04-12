import { Box } from "ink";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

// Braille character mapping for 2x4 dot grids
// Each braille character represents a 2x4 pixel grid
// Dot positions:  0 3
//                 1 4
//                 2 5
//                 6 7
const BRAILLE_BASE = 0x2800;
const BRAILLE_DOTS = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80];

// Classic Lissajous frequency ratios that produce beautiful closed curves
const RATIO_PAIRS: [number, number][] = [
	[1, 2],
	[2, 3],
	[3, 4],
	[3, 5],
	[4, 5],
	[1, 3],
	[2, 5],
	[5, 6],
	[3, 7],
	[4, 7],
];

interface LissajousState {
	initialized: boolean;
	ratioIndex: number;
	t: number;
	phase: number;
	points: { x: number; y: number; age: number }[];
	transitionFrame: number;
	brailleGrid: number[];
	brailleColors: string[];
	gridW: number;
	gridH: number;
}

function hueToHex(hue: number): string {
	const h = ((hue % 360) + 360) % 360;
	const s = 1;
	const l = 0.6;
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;
	let r: number;
	let g: number;
	let b: number;
	if (h < 60) {
		r = c;
		g = x;
		b = 0;
	} else if (h < 120) {
		r = x;
		g = c;
		b = 0;
	} else if (h < 180) {
		r = 0;
		g = c;
		b = x;
	} else if (h < 240) {
		r = 0;
		g = x;
		b = c;
	} else if (h < 300) {
		r = x;
		g = 0;
		b = c;
	} else {
		r = c;
		g = 0;
		b = x;
	}
	const toHex = (v: number) =>
		Math.round((v + m) * 255)
			.toString(16)
			.padStart(2, "0");
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const MAX_TRAIL = 600;
const TRANSITION_FRAMES = 60;

const LissajousFigures: React.FC<ScreensaverProps> = ({
	columns,
	rows,
	frame,
}) => {
	const stateRef = useRef<LissajousState>({
		initialized: false,
		ratioIndex: 0,
		t: 0,
		phase: 0,
		points: [],
		transitionFrame: 0,
		brailleGrid: [],
		brailleColors: [],
		gridW: 0,
		gridH: 0,
	});

	const height = rows - 1;
	const s = stateRef.current;

	if (!s.initialized) {
		s.ratioIndex = Math.floor(Math.random() * RATIO_PAIRS.length);
		s.initialized = true;
	}

	// Braille grid dimensions: each cell is 2 pixels wide, 4 pixels tall
	const brailleW = columns;
	const brailleH = height;
	const pixelW = brailleW * 2;
	const pixelH = brailleH * 4;

	// Reallocate braille buffers on resize
	if (s.gridW !== brailleW || s.gridH !== brailleH) {
		s.gridW = brailleW;
		s.gridH = brailleH;
		s.brailleGrid = new Array(brailleW * brailleH).fill(0);
		s.brailleColors = new Array(brailleW * brailleH).fill("");
		s.points = [];
	}

	// Current ratio
	const [freqA, freqB] = RATIO_PAIRS[s.ratioIndex];

	// Slowly evolve the phase offset
	s.phase += 0.003;

	// Add new points along the curve
	const stepsPerFrame = 8;
	for (let i = 0; i < stepsPerFrame; i++) {
		s.t += 0.02;

		const x = Math.sin(freqA * s.t + s.phase);
		const y = Math.sin(freqB * s.t);

		// Map to pixel coordinates with padding
		const padX = pixelW * 0.1;
		const padY = pixelH * 0.1;
		const px = Math.floor(((x + 1) / 2) * (pixelW - 2 * padX) + padX);
		const py = Math.floor(((y + 1) / 2) * (pixelH - 2 * padY) + padY);

		s.points.push({ x: px, y: py, age: 0 });
	}

	// Age all points
	for (let i = 0; i < s.points.length; i++) {
		s.points[i].age++;
	}

	// Remove old points (compact in place)
	let write = 0;
	for (let read = 0; read < s.points.length; read++) {
		if (s.points[read].age < MAX_TRAIL) {
			s.points[write++] = s.points[read];
		}
	}
	s.points.length = write;

	// Transition to next ratio periodically
	s.transitionFrame++;
	if (s.transitionFrame > MAX_TRAIL + TRANSITION_FRAMES) {
		s.ratioIndex = (s.ratioIndex + 1) % RATIO_PAIRS.length;
		s.transitionFrame = 0;
		s.t = 0;
	}

	// Clear braille grid
	s.brailleGrid.fill(0);
	s.brailleColors.fill("");

	// Plot points into braille grid
	for (const point of s.points) {
		const bx = Math.floor(point.x / 2);
		const by = Math.floor(point.y / 4);

		if (bx < 0 || bx >= brailleW || by < 0 || by >= brailleH) continue;

		const subX = point.x % 2;
		const subY = point.y % 4;
		const dotIndex = subY < 3 ? subY + subX * 3 : 6 + subX;
		const cellIndex = by * brailleW + bx;

		s.brailleGrid[cellIndex] |= BRAILLE_DOTS[dotIndex];

		// Color based on position along the curve (hue from age)
		const ageFraction = point.age / MAX_TRAIL;
		const brightness = 1 - ageFraction;
		if (brightness > 0.1) {
			const hue = (s.t * 10 + point.age * 0.5) % 360;
			const currentColor = s.brailleColors[cellIndex];
			// Newer points take priority
			if (!currentColor || ageFraction < 0.3) {
				s.brailleColors[cellIndex] = hueToHex(hue);
			}
		}
	}

	// Build sparse rows from braille grid
	const rowElements: React.ReactNode[] = [];
	for (let y = 0; y < brailleH; y++) {
		const row: (SparseCell | null)[] = new Array(brailleW);
		for (let x = 0; x < brailleW; x++) {
			const cellIndex = y * brailleW + x;
			const dots = s.brailleGrid[cellIndex];
			if (dots === 0) {
				row[x] = null;
			} else {
				const char = String.fromCharCode(BRAILLE_BASE + dots);
				const color = s.brailleColors[cellIndex] || "#444444";
				row[x] = { char, color };
			}
		}
		rowElements.push(renderSparseRow(row, y));
	}

	return <Box flexDirection="column">{rowElements}</Box>;
};

export const lissajousFigures: ScreensaverModule = {
	name: "lissajous-figures",
	description:
		"Oscillating curves tracing Lissajous patterns with morphing frequency ratios",
	component: LissajousFigures,
	fps: 20,
};
