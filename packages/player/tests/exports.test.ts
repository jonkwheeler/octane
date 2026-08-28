import { describe, expect, it } from 'vitest';
import Player, { AUDIO_EXTENSIONS, VIDEO_EXTENSIONS } from '../src/index';

describe('@octanejs/player exports', () => {
	it('exposes player helpers and upstream media patterns', () => {
		expect(Player).toBeTypeOf('function');
		expect(Player.canPlay('https://example.com/video.mp4')).toBe(true);
		expect(Player.canPlay('blob:https://example.com/media')).toBe(true);
		expect(Player.canPlay('data:video/mp4;base64,AAAA')).toBe(true);
		expect(Player.canPlay('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
		expect(Player.canPlay('https://example.com/watch')).toBe(false);
		expect(Player.canPlay('data:text/html,<h1>not media</h1>')).toBe(false);
		expect(AUDIO_EXTENSIONS).toBeInstanceOf(RegExp);
		expect(VIDEO_EXTENSIONS).toBeInstanceOf(RegExp);
	});
});
