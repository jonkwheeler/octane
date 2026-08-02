export type Size = {
	w: number;
	h: number;
};

export type FrameData = {
	frame: {
		x: number;
		y: number;
		w: number;
		h: number;
	};
	scaleRatio?: number;
	rotated: boolean;
	trimmed: boolean;
	spriteSourceSize: {
		x: number;
		y: number;
		w: number;
		h: number;
	};
	sourceSize: Size;
};

export type MetaData = {
	version: string;
	size: Size;
	rows: number;
	columns: number;
	frameWidth: number;
	frameHeight: number;
	scale: string;
};

export type SpriteData = {
	frames: Record<string, FrameData[]> | FrameData[];
	meta: MetaData;
};

export function getFirstFrame(frames: SpriteData['frames'], frameName?: string): FrameData {
	if (Array.isArray(frames)) return frames[0];
	const key = frameName ?? Object.keys(frames)[0];
	return frames[key][0];
}

export function checkIfFrameIsEmpty(frameData: Uint8ClampedArray): boolean {
	for (let index = 3; index < frameData.length; index += 4) {
		if (frameData[index] !== 0) return false;
	}
	return true;
}
