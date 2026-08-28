import { describe, expect, it } from 'vitest';
import Player, { AUDIO_EXTENSIONS, VIDEO_EXTENSIONS } from '../src/index';

describe('@octanejs/player exports', () => {
	it('exposes player helpers and upstream media patterns', () => {
		expect(Player).toBeTypeOf('function');
		expect(Player.canPlay('https://example.com/video.mp4')).toBe(true);
		expect(AUDIO_EXTENSIONS).toBeInstanceOf(RegExp);
		expect(VIDEO_EXTENSIONS).toBeInstanceOf(RegExp);
	});
});
