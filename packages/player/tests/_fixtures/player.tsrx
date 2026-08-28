import Player from '../../src/index';

type VideoRef = { current: HTMLVideoElement | null } | ((node: HTMLVideoElement | null) => void);

export function PlayerRefFixture(props: { playerRef: VideoRef }) @{
	<Player ref={props.playerRef} />
}

export function PlayerChildrenFixture() @{
	<Player>
		<source src="/video.webm" type="video/webm" />
		<track src="/captions.vtt" kind="captions" srcLang="en" label="English" />
	</Player>
}

export function PlayerPlaybackFixture(props: { src: string; playing: boolean }) @{
	<Player src={props.src} playing={props.playing} />
}
