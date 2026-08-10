// Declaration companion for devtools.tsrx.
import type { OctaneNode } from 'octane';
import type {
	ClientEventBusConfig,
	TanStackDevtoolsConfig,
	TanStackDevtoolsPlugin,
	TanStackDevtoolsPluginProps,
	TanStackDevtoolsTheme,
} from '@tanstack/devtools';

type PluginRender =
	| OctaneNode
	| ((el: HTMLElement, props: TanStackDevtoolsPluginProps) => OctaneNode);

type TriggerProps = {
	theme: TanStackDevtoolsTheme;
};

type TriggerRender =
	| OctaneNode
	| ((el: HTMLElement, props: TriggerProps) => OctaneNode);

export type TanStackDevtoolsOctanePlugin = Omit<TanStackDevtoolsPlugin, 'render' | 'name'> & {
	render: PluginRender;
	name: string | PluginRender;
};

type TanStackDevtoolsOctaneConfig = Omit<Partial<TanStackDevtoolsConfig>, 'customTrigger'> & {
	customTrigger?: TriggerRender;
};

export interface TanStackDevtoolsOctaneInit {
	plugins?: Array<TanStackDevtoolsOctanePlugin>;
	config?: TanStackDevtoolsOctaneConfig;
	eventBusConfig?: ClientEventBusConfig;
}

export declare const TanStackDevtools: (props: TanStackDevtoolsOctaneInit) => OctaneNode | null;

export {};
