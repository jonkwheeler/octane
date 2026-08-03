import type { ComponentBody, ElementDescriptor } from 'octane';
import type { CSSProperties, HTMLProps, Key } from 'react';

// OCTANE DIVERGENCE[custom-component-identity][types:adapted-public]

export type LineNumberStyleFunction = (lineNumber: number) => CSSProperties;
export type LineTagPropsFunction = (lineNumber: number) => HTMLProps<HTMLElement>;

export interface RendererNode {
	type: 'element' | 'text';
	value?: string | number;
	tagName?: keyof HTMLElementTagNameMap | ComponentBody<any>;
	properties?: { className: any[]; [key: string]: any };
	children?: RendererNode[];
}

export interface RendererProps {
	rows: RendererNode[];
	stylesheet: Record<string, CSSProperties>;
	useInlineStyles: boolean;
}

export interface SyntaxHighlighterProps {
	language?: string;
	style?: Record<string, CSSProperties>;
	children: string | string[];
	customStyle?: CSSProperties;
	codeTagProps?: HTMLProps<HTMLElement>;
	useInlineStyles?: boolean;
	showLineNumbers?: boolean;
	showInlineLineNumbers?: boolean;
	startingLineNumber?: number;
	lineNumberContainerStyle?: CSSProperties;
	lineNumberStyle?: CSSProperties | LineNumberStyleFunction;
	wrapLines?: boolean;
	wrapLongLines?: boolean;
	lineProps?: LineTagPropsFunction | HTMLProps<HTMLElement>;
	renderer?: (props: RendererProps) => unknown;
	PreTag?: keyof HTMLElementTagNameMap | ComponentBody<any>;
	CodeTag?: keyof HTMLElementTagNameMap | ComponentBody<any>;
	[spread: string]: any;
}

export interface CreateElementProps {
	node: RendererNode;
	stylesheet: Record<string, CSSProperties>;
	style?: CSSProperties;
	useInlineStyles: boolean;
	key: Key;
}

export interface HighlighterComponent {
	(props: SyntaxHighlighterProps): ElementDescriptor;
	supportedLanguages: string[];
}

export interface LightComponent extends HighlighterComponent {
	registerLanguage(name: string, language: any): void;
}

export interface PrismLightComponent extends LightComponent {
	alias(name: string, alias: string | string[]): void;
	alias(aliases: Record<string, string | string[]>): void;
}

export interface AsyncComponent extends LightComponent {
	preload(): Promise<void>;
	loadLanguage(language: string): Promise<void>;
	isSupportedLanguage(language: string): boolean;
	isRegistered(language: string): boolean;
}

declare const SyntaxHighlighter: HighlighterComponent;
export default SyntaxHighlighter;

export const LightAsync: AsyncComponent;
export const Light: LightComponent;
export const PrismAsyncLight: AsyncComponent;
export const PrismAsync: AsyncComponent;
export const PrismLight: PrismLightComponent;
export const Prism: HighlighterComponent;

export function createElement(props: CreateElementProps): ElementDescriptor;
