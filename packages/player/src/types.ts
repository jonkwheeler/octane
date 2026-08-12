import type { OctaneNode } from 'octane';

export type MediaEventHandler = (event: Event & { currentTarget: HTMLVideoElement }) => void;

export interface VideoElementProps {
	src?: string;
	width?: number | string;
	height?: number | string;
	controls?: boolean;
	loop?: boolean;
	muted?: boolean;
	playsInline?: boolean;
	playbackRate?: number;
	volume?: number;
	onPlay?: MediaEventHandler;
	onPause?: MediaEventHandler;
	onEnded?: MediaEventHandler;
	onError?: MediaEventHandler;
}

export interface PreviewProps {
	light?: boolean | string | OctaneNode;
	oEmbedUrl?: string;
	onClickPreview?: (event: Event) => void;
	playIcon?: OctaneNode;
	previewAriaLabel?: string;
	previewTabIndex?: number;
}

export interface PlayerConfig {
	dash?: Record<string, unknown>;
	hls?: Record<string, unknown>;
	html?: Record<string, unknown>;
	mux?: Record<string, unknown>;
	spotify?: Record<string, unknown>;
	tiktok?: Record<string, unknown>;
	twitch?: Record<string, unknown>;
	vimeo?: Record<string, unknown>;
	wistia?: Record<string, unknown>;
	youtube?: Record<string, unknown>;
}

export interface ReactPlayerProps extends PreviewProps, VideoElementProps {
	config?: PlayerConfig;
	fallback?: OctaneNode;
	onReady?: () => void;
	onStart?: MediaEventHandler;
	pip?: boolean;
	playing?: boolean;
	wrapper?: string | ((props: Record<string, unknown>) => OctaneNode);
}

export type Config = PlayerConfig;
