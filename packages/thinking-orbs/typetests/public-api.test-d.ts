import type { OctaneNode } from 'octane';
import type { OrbSize, OrbState, OrbTheme, ThinkingOrbProps } from '@octanejs/thinking-orbs';
import { MODE_DRAWS, ThinkingOrb, resolvePreset, STATE_TO_MODE } from '@octanejs/thinking-orbs';

declare function expectType<T>(value: T): void;

expectType<typeof ThinkingOrb>(ThinkingOrb);
expectType<typeof resolvePreset>(resolvePreset);
expectType<typeof MODE_DRAWS>(MODE_DRAWS);
expectType<typeof STATE_TO_MODE>(STATE_TO_MODE);

expectType<OrbState>('working');
expectType<OrbSize>(64);
expectType<OrbTheme>('auto');

type OrbComponent = typeof ThinkingOrb;
expectType<OrbComponent>(ThinkingOrb);

type StateProp = ThinkingOrbProps['state'];
expectType<OrbState | undefined>(null as unknown as StateProp);

type RefProp = ThinkingOrbProps['ref'];
expectType<RefProp>(null as unknown as RefProp);

// Keep OctaneNode in the probe set so renderable-type drift stays visible.
expectType<OctaneNode | null>(null);

// @ts-expect-error unknown animation states are rejected
resolvePreset('idle', 64);

// @ts-expect-error size accepts only the two tuned presets
resolvePreset('working', 32);
