import { useEffect, useState } from 'octane';
import type { OrbTheme } from './types';

type RefObject<T> = { current: T | null };

function ancestorTheme(el: Element | null): boolean | null {
	let node: Element | null = el;
	while (node) {
		const attr = node.getAttribute('data-theme');
		if (attr === 'dark') return true;
		if (attr === 'light') return false;
		if (node.classList.contains('dark')) return true;
		if (node.classList.contains('light')) return false;
		node = node.parentElement;
	}
	return null;
}

function systemDark(): boolean {
	return typeof matchMedia === 'undefined' || matchMedia('(prefers-color-scheme: dark)').matches;
}

function initialDark(theme: OrbTheme): boolean {
	if (theme === 'dark') return true;
	if (theme === 'light') return false;
	return systemDark();
}

export function useResolvedDark(theme: OrbTheme, hostRef: RefObject<Element | null>): boolean {
	const [dark, setDark] = useState(function () {
		return initialDark(theme);
	});

	useEffect(() => {
		if (theme === 'dark') {
			setDark(true);
			return;
		}
		if (theme === 'light') {
			setDark(false);
			return;
		}

		function resolve(): void {
			const fromTree = ancestorTheme(hostRef.current);
			setDark(fromTree ?? systemDark());
		}
		resolve();

		const mq =
			typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null;
		const onMq = (): void => {
			resolve();
		};
		mq?.addEventListener('change', onMq);

		let mo: MutationObserver | null = null;
		if (typeof MutationObserver !== 'undefined' && hostRef.current) {
			mo = new MutationObserver(resolve);
			mo.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['class', 'data-theme'],
				subtree: true,
			});
		}

		return () => {
			mq?.removeEventListener('change', onMq);
			mo?.disconnect();
		};
	}, [theme, hostRef]);

	return dark;
}

function initialReducedMotion(): boolean {
	return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useReducedMotion(): boolean {
	const [reduced, setReduced] = useState(initialReducedMotion);
	useEffect(() => {
		if (typeof matchMedia === 'undefined') return;
		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		setReduced(mq.matches);
		const on = (event: MediaQueryListEvent): void => {
			setReduced(event.matches);
		};
		mq.addEventListener('change', on);
		return () => {
			mq.removeEventListener('change', on);
		};
	}, []);
	return reduced;
}
