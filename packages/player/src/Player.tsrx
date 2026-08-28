import { useEffect, useRef, type OctaneNode } from 'octane';
import type { ReactPlayerProps } from './types';

export type PlayerProps =
	Omit<ReactPlayerProps, 'ref'> & {
		children?: OctaneNode;
		ref?: { current: HTMLVideoElement | null } | ((node: HTMLVideoElement | null) => void);
	};
export function Player(props: PlayerProps) @{
	const media = useRef<HTMLVideoElement | null>(null);
	useEffect(() => {
		const node = media.current;
		if (!node) return;
		node.volume = props.volume ?? 1;
		node.muted = props.muted ?? false;
		if (props.playing) void node.play();
		else node.pause();
	}, [props.playing, props.volume, props.muted]);
	<video
		ref={[media, props.ref ?? null]}
		src={typeof props.src === 'string' ? props.src : undefined}
		controls={props.controls}
		loop={props.loop}
		playsInline={props.playsInline}
		width={props.width}
		height={props.height}
		onPlay={props.onPlay}
		onPause={props.onPause}
		onEnded={props.onEnded}
		onError={props.onError}
	>{props.children}</video>
}
Player.canPlay = (src: string) => /^(https?:|blob:|data:)/.test(src);
Player.canEnablePIP = (src: string) => Player.canPlay(src);
Player.addCustomPlayer = () => {};
Player.removeCustomPlayers = () => {};
