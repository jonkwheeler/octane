import { describe, expect, it } from 'vitest';
import { mount } from '../../octane/tests/_helpers';
import { PlayerChildrenFixture, PlayerRefFixture } from './_fixtures/player.tsrx';

describe('@octanejs/player rendering', () => {
	it('exposes the rendered video through callback and object refs', () => {
		const callbackValues: Array<HTMLVideoElement | null> = [];
		const callbackApp = mount(PlayerRefFixture, {
			playerRef: (node) => callbackValues.push(node),
		});
		const callbackVideo = callbackApp.find('video');
		expect(callbackVideo).toBeInstanceOf(HTMLVideoElement);
		expect(callbackValues).toEqual([callbackVideo]);
		callbackApp.unmount();
		expect(callbackValues).toEqual([callbackVideo, null]);

		const objectRef = { current: null as HTMLVideoElement | null };
		const objectApp = mount(PlayerRefFixture, { playerRef: objectRef });
		const objectVideo = objectApp.find('video');
		expect(objectVideo).toBeInstanceOf(HTMLVideoElement);
		expect(objectRef.current).toBe(objectVideo);
		objectApp.unmount();
		expect(objectRef.current).toBeNull();
	});

	it('renders nested media children inside the video', () => {
		const app = mount(PlayerChildrenFixture);
		const video = app.find('video');
		const source = app.find('source');
		const track = app.find('track');

		expect(source.parentElement).toBe(video);
		expect(source.getAttribute('src')).toBe('/video.webm');
		expect(track.parentElement).toBe(video);
		expect(track.getAttribute('src')).toBe('/captions.vtt');
		app.unmount();
	});
});
