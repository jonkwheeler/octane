import {
	type FrameData,
	type MetaData,
	type Size,
	type SpriteData,
	checkIfFrameIsEmpty,
	getFirstFrame,
} from '../src/index.js';

const size: Size = { w: 16, h: 32 };
const frame: FrameData = {
	frame: { x: 0, y: 0, w: 16, h: 32 },
	rotated: false,
	trimmed: false,
	spriteSourceSize: { x: 0, y: 0, w: 16, h: 32 },
	sourceSize: size,
};
const meta: MetaData = {
	version: '1',
	size,
	rows: 1,
	columns: 1,
	frameWidth: 16,
	frameHeight: 32,
	scale: '1',
};
const data: SpriteData = { frames: [frame], meta };
getFirstFrame(data.frames).frame.x;
checkIfFrameIsEmpty(new Uint8ClampedArray()).valueOf();

// @ts-expect-error size dimensions are numeric
const invalidSize: Size = { w: '16', h: 32 };
// @ts-expect-error pixel data must preserve clamped-byte semantics
checkIfFrameIsEmpty([0, 0, 0, 0]);
