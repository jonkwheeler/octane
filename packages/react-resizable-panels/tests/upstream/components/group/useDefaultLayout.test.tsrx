import { cleanup, render, renderHook } from '@octanejs/testing-library';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
	mockBoundingClientRect,
	setDefaultElementBounds,
	unmockBoundingClientRect,
} from '../../utils/test/mockBoundingClientRect';
import { mockResizeObserver, unmockResizeObserver } from '../../utils/test/mockResizeObserver';
import { Panel } from '../../../../src/components/panel/Panel';
import { getStorageKey } from '../../../../src/components/group/auto-save/getStorageKey';
import { Group } from '../../../../src/components/group/Group';
import type { LegacyLayout } from '../../../../src/components/group/auto-save/readLegacyLayout';
import type {
	GroupImperativeHandle,
	Layout,
	LayoutStorage,
} from '../../../../src/components/group/types';
import { useDefaultLayout } from '../../../../src/components/group/useDefaultLayout';

function createRef<T>() {
	return { current: null as T | null };
}

beforeEach(() => {
	vi.useRealTimers();
	mockBoundingClientRect();
	mockResizeObserver();
});

afterEach(() => {
	cleanup();
	unmockResizeObserver();
	unmockBoundingClientRect();
	vi.useRealTimers();
});

describe('useDefaultLayout', () => {
	describe('modern onLayoutChanged prop', () => {
		// Fidelity classification: mechanically adapted (framework harness/imports only).
		test('should read/write from the provided Storage API', () => {
			const storage: LayoutStorage = {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
			};

			const { result } = renderHook(
				() => useDefaultLayout({
					id: 'test-group-id',
					storage,
				}),
			);

			expect(result.current.defaultLayout).toMatchInlineSnapshot(`undefined`);
			expect(storage.getItem).toHaveBeenCalled();
			expect(storage.getItem).toHaveBeenCalledWith('react-resizable-panels:test-group-id');
			expect(storage.setItem).not.toHaveBeenCalled();

			result.current.onLayoutChanged(
				{
					bar: 35,
					baz: 65,
				},
				{ isUserInteraction: false },
			);
			expect(storage.setItem).toHaveBeenCalledTimes(1);
			expect(storage.setItem).toHaveBeenCalledWith(
				'react-resizable-panels:test-group-id',
				JSON.stringify({
					bar: 35,
					baz: 65,
				}),
			);
		});

		// Fidelity classification: mechanically adapted (framework harness/imports only).\n
		test('should ignore debounce param when using onLayoutChanged', () => {
			vi.useFakeTimers();

			const storage: LayoutStorage = {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
			};

			const { result } = renderHook(
				() => useDefaultLayout({
					debounceSaveMs: 150,
					id: 'test-group-id',
					storage,
				}),
			);

			expect(result.current.defaultLayout).toMatchInlineSnapshot(`undefined`);
			expect(storage.setItem).not.toHaveBeenCalled();

			result.current.onLayoutChanged(
				{
					bar: 35,
					baz: 65,
				},
				{ isUserInteraction: false },
			);

			expect(storage.setItem).toHaveBeenCalledTimes(1);
			expect(storage.setItem).toHaveBeenCalledWith(
				'react-resizable-panels:test-group-id',
				JSON.stringify({
					bar: 35,
					baz: 65,
				}),
			);
		});

		// See github.com/bvaughn/react-resizable-panels/pull/540
		describe('should ignore temporarily invalid layouts', () => {
			// Fidelity classification: mechanically adapted (framework harness/imports only).
			test('on mount (ids mismatch)', () => {
				const groupRef = createRef<GroupImperativeHandle>();

				setDefaultElementBounds(new DOMRect(0, 0, 100, 50));

				render(
					<Group
						defaultLayout={{
							left: 20,
							right: 50,
						}}
						groupRef={groupRef}
					>
						<Panel id="before" />
						<Panel id="after" />
					</Group>,
				);

				expect(groupRef.current?.getLayout()).toMatchInlineSnapshot(
					`
      {
        "after": 50,
        "before": 50,
      }
    `,
				);
			});

			// Fidelity classification: mechanically adapted (framework harness/imports only).\n
			test('on mount (num panels mismatch)', () => {
				const groupRef = createRef<GroupImperativeHandle>();

				setDefaultElementBounds(new DOMRect(0, 0, 100, 50));

				render(
					<Group
						defaultLayout={{
							left: 20,
							middle: 30,
							right: 50,
						}}
						groupRef={groupRef}
					>
						<Panel id="left" />
						<Panel id="right" />
					</Group>,
				);

				expect(groupRef.current?.getLayout()).toMatchInlineSnapshot(
					`
      {
        "left": 50,
        "right": 50,
      }
    `,
				);
			});

			// Fidelity classification: mechanically adapted (framework harness/imports only).\n
			test('after update (num panels mismatch)', () => {
				const groupRef = createRef<GroupImperativeHandle>();

				setDefaultElementBounds(new DOMRect(0, 0, 100, 50));

				const { rerender } = render(
					<Group
						defaultLayout={{
							left: 20,
							middle: 30,
							right: 50,
						}}
						groupRef={groupRef}
					>
						<Panel id="left" />
						<Panel id="middle" />
						<Panel id="right" />
					</Group>,
				);

				expect(groupRef.current?.getLayout()).toMatchInlineSnapshot(
					`
      {
        "left": 20,
        "middle": 30,
        "right": 50,
      }
    `,
				);

				rerender(
					<Group
						defaultLayout={{
							left: 20,
							middle: 30,
							right: 50,
						}}
						groupRef={groupRef}
					>
						<Panel id="left">left</Panel>
						<Panel id="right">right</Panel>
					</Group>,
				);

				expect(groupRef.current?.getLayout()).toMatchInlineSnapshot(
					`
      {
        "left": 50,
        "right": 50,
      }
    `,
				);
			});
		});

		// Fidelity classification: mechanically adapted (framework harness/imports only).\n
		test('should save separate layouts per panel group when panelIds param is present', () => {
			const storage: LayoutStorage = {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
			};

			const { result } = renderHook(
				() => useDefaultLayout({
					id: 'test-group-id',
					panelIds: ['foo', 'bar'],
					storage,
				}),
			);

			expect(result.current.defaultLayout).toMatchInlineSnapshot(`undefined`);
			expect(storage.getItem).toHaveBeenCalled();
			expect(storage.getItem).toHaveBeenCalledWith('react-resizable-panels:test-group-id:foo:bar');
			expect(storage.setItem).not.toHaveBeenCalled();

			result.current.onLayoutChanged(
				{
					foo: 35,
					bar: 65,
				},
				{ isUserInteraction: false },
			);
			expect(storage.setItem).toHaveBeenCalledTimes(1);
			expect(storage.setItem).toHaveBeenCalledWith(
				'react-resizable-panels:test-group-id:foo:bar',
				JSON.stringify({
					foo: 35,
					bar: 65,
				}),
			);

			// This test verifies two things:
			// 1. Panel layout is saved separately
			// 2. Panel ids in the Layout are prioritized over those in the prop
			result.current.onLayoutChanged(
				{
					foo: 25,
					bar: 55,
					baz: 20,
				},
				{ isUserInteraction: false },
			);
			expect(storage.setItem).toHaveBeenCalledTimes(2);
			expect(storage.setItem).toHaveBeenCalledWith(
				'react-resizable-panels:test-group-id:foo:bar:baz',
				JSON.stringify({
					foo: 25,
					bar: 55,
					baz: 20,
				}),
			);
		});

		// Fidelity classification: mechanically adapted (framework harness/imports only).\n
		test('should ignore invalid layouts (panel ids mismatch)', () => {
			setDefaultElementBounds(new DOMRect(0, 0, 100, 50));

			const groupRef = createRef<GroupImperativeHandle>();

			render(
				<Group
					defaultLayout={{
						foo: 40,
						bar: 60,
					}}
					groupRef={groupRef}
				>
					<Panel id="bar" defaultSize="30%" />
					<Panel id="baz" />
				</Group>,
			);

			expect(groupRef.current?.getLayout()).toMatchInlineSnapshot(
				`
      {
        "bar": 30,
        "baz": 70,
      }
    `,
			);
		});

		// See https://github.com/bvaughn/react-resizable-panels/issues/656
		// Fidelity classification: mechanically adapted (framework harness/imports only).
		test('should support out-of-order panel ids', () => {
			setDefaultElementBounds(new DOMRect(0, 0, 100, 50));

			const groupRef = createRef<GroupImperativeHandle>();

			render(
				<Group
					defaultLayout={{
						bottom: 50,
						middle: 30,
						top: 20,
					}}
					groupRef={groupRef}
				>
					<Panel id="top" defaultSize="30%" />
					<Panel id="middle" />
					<Panel id="bottom" defaultSize="30%" />
				</Group>,
			);

			expect(groupRef.current?.getLayout()).toMatchInlineSnapshot(
				`
      {
        "bottom": 50,
        "middle": 30,
        "top": 20,
      }
    `,
			);
		});

		// See github.com/bvaughn/react-resizable-panels/pull/716
		// Fidelity classification: mechanically adapted (framework harness/imports only).
		test('should ignore non-user interactions', () => {
			const storage: LayoutStorage = {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
			};

			const { result } = renderHook(
				() => useDefaultLayout({
					id: 'test-group-id',
					onlySaveAfterUserInteractions: true,
					storage,
				}),
			);

			result.current.onLayoutChanged(
				{
					bar: 35,
					baz: 65,
				},
				{ isUserInteraction: false },
			);
			expect(storage.setItem).not.toHaveBeenCalled();

			result.current.onLayoutChanged(
				{
					bar: 35,
					baz: 65,
				},
				{ isUserInteraction: true },
			);
			expect(storage.setItem).toHaveBeenCalledTimes(1);
		});
	});

	describe('legacy onLayoutChange prop', () => {
		// Fidelity classification: mechanically adapted (framework harness/imports only).
		test('should read/write from the provided Storage API', () => {
			const storage: LayoutStorage = {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
			};

			const { result } = renderHook(
				() => useDefaultLayout({
					debounceSaveMs: 0,
					id: 'test-group-id',
					storage,
				}),
			);

			expect(result.current.defaultLayout).toMatchInlineSnapshot(`undefined`);
			expect(storage.getItem).toHaveBeenCalled();
			expect(storage.getItem).toHaveBeenCalledWith('react-resizable-panels:test-group-id');
			expect(storage.setItem).not.toHaveBeenCalled();

			result.current.onLayoutChange({
				bar: 35,
				baz: 65,
			});
			expect(storage.setItem).toHaveBeenCalledTimes(1);
			expect(storage.setItem).toHaveBeenCalledWith(
				'react-resizable-panels:test-group-id',
				JSON.stringify({
					bar: 35,
					baz: 65,
				}),
			);
		});

		// Fidelity classification: mechanically adapted (framework harness/imports only).\n
		test('should support debounced write', () => {
			vi.useFakeTimers();

			const storage: LayoutStorage = {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
			};

			const { result } = renderHook(
				() => useDefaultLayout({
					debounceSaveMs: 150,
					id: 'test-group-id',
					storage,
				}),
			);

			expect(result.current.defaultLayout).toMatchInlineSnapshot(`undefined`);
			expect(storage.setItem).not.toHaveBeenCalled();

			result.current.onLayoutChange({
				bar: 35,
				baz: 65,
			});
			expect(storage.setItem).not.toHaveBeenCalled();

			vi.advanceTimersByTime(149);
			expect(storage.setItem).not.toHaveBeenCalled();

			vi.advanceTimersByTime(1);
			expect(storage.setItem).toHaveBeenCalledTimes(1);
			expect(storage.setItem).toHaveBeenCalledWith(
				'react-resizable-panels:test-group-id',
				JSON.stringify({
					bar: 35,
					baz: 65,
				}),
			);
		});

		// Fidelity classification: mechanically adapted (framework harness/imports only).\n
		test('should override pending debounce with newer value', () => {
			vi.useFakeTimers();

			const storage: LayoutStorage = {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
			};

			const { result } = renderHook(
				() => useDefaultLayout({
					debounceSaveMs: 150,
					id: 'test-group-id',
					storage,
				}),
			);

			expect(result.current.defaultLayout).toMatchInlineSnapshot(`undefined`);
			expect(storage.setItem).not.toHaveBeenCalled();

			result.current.onLayoutChange({
				bar: 35,
				baz: 65,
			});
			expect(storage.setItem).not.toHaveBeenCalled();

			vi.advanceTimersByTime(149);
			expect(storage.setItem).not.toHaveBeenCalled();

			result.current.onLayoutChange({
				bar: 25,
				baz: 75,
			});

			vi.advanceTimersByTime(149);
			expect(storage.setItem).not.toHaveBeenCalled();

			vi.advanceTimersByTime(1);
			expect(storage.setItem).toHaveBeenCalledTimes(1);
			expect(storage.setItem).toHaveBeenCalledWith(
				'react-resizable-panels:test-group-id',
				JSON.stringify({
					bar: 25,
					baz: 75,
				}),
			);
		});

		// Fidelity classification: mechanically adapted (framework harness/imports only).\n
		test('should cancel pending debounced write on unmount', () => {
			vi.useFakeTimers();

			const storage: LayoutStorage = {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
			};

			const { result, unmount } = renderHook(
				() => useDefaultLayout({
					debounceSaveMs: 150,
					id: 'test-group-id',
					storage,
				}),
			);

			expect(result.current.defaultLayout).toMatchInlineSnapshot(`undefined`);
			expect(storage.setItem).not.toHaveBeenCalled();

			result.current.onLayoutChange({
				bar: 35,
				baz: 65,
			});
			expect(storage.setItem).not.toHaveBeenCalled();

			vi.advanceTimersByTime(149);
			expect(storage.setItem).not.toHaveBeenCalled();

			unmount();

			vi.advanceTimersByTime(100);
			expect(storage.setItem).not.toHaveBeenCalled();
		});

		// See github.com/bvaughn/react-resizable-panels/pull/540
		describe('should ignore temporarily invalid layouts', () => {
			// Fidelity classification: mechanically adapted (framework harness/imports only).
			test('on mount (ids mismatch)', () => {
				const groupRef = createRef<GroupImperativeHandle>();

				setDefaultElementBounds(new DOMRect(0, 0, 100, 50));

				render(
					<Group
						defaultLayout={{
							left: 20,
							right: 50,
						}}
						groupRef={groupRef}
					>
						<Panel id="before" />
						<Panel id="after" />
					</Group>,
				);

				expect(groupRef.current?.getLayout()).toMatchInlineSnapshot(
					`
      {
        "after": 50,
        "before": 50,
      }
    `,
				);
			});

			// Fidelity classification: mechanically adapted (framework harness/imports only).\n
			test('on mount (num panels mismatch)', () => {
				const groupRef = createRef<GroupImperativeHandle>();

				setDefaultElementBounds(new DOMRect(0, 0, 100, 50));

				render(
					<Group
						defaultLayout={{
							left: 20,
							middle: 30,
							right: 50,
						}}
						groupRef={groupRef}
					>
						<Panel id="left" />
						<Panel id="right" />
					</Group>,
				);

				expect(groupRef.current?.getLayout()).toMatchInlineSnapshot(
					`
      {
        "left": 50,
        "right": 50,
      }
    `,
				);
			});

			// Fidelity classification: mechanically adapted (framework harness/imports only).\n
			test('after update (num panels mismatch)', () => {
				const groupRef = createRef<GroupImperativeHandle>();

				setDefaultElementBounds(new DOMRect(0, 0, 100, 50));

				const { rerender } = render(
					<Group
						defaultLayout={{
							left: 20,
							middle: 30,
							right: 50,
						}}
						groupRef={groupRef}
					>
						<Panel id="left" />
						<Panel id="middle" />
						<Panel id="right" />
					</Group>,
				);

				expect(groupRef.current?.getLayout()).toMatchInlineSnapshot(
					`
      {
        "left": 20,
        "middle": 30,
        "right": 50,
      }
    `,
				);

				rerender(
					<Group
						defaultLayout={{
							left: 20,
							middle: 30,
							right: 50,
						}}
						groupRef={groupRef}
					>
						<Panel id="left">left</Panel>
						<Panel id="right">right</Panel>
					</Group>,
				);

				expect(groupRef.current?.getLayout()).toMatchInlineSnapshot(
					`
      {
        "left": 50,
        "right": 50,
      }
    `,
				);
			});
		});

		// Fidelity classification: mechanically adapted (framework harness/imports only).\n
		test('should save separate layouts per panel group when panelIds param is present', () => {
			const storage: LayoutStorage = {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
			};

			const { result } = renderHook(
				() => useDefaultLayout({
					debounceSaveMs: 0,
					id: 'test-group-id',
					panelIds: ['foo', 'bar'],
					storage,
				}),
			);

			expect(result.current.defaultLayout).toMatchInlineSnapshot(`undefined`);
			expect(storage.getItem).toHaveBeenCalled();
			expect(storage.getItem).toHaveBeenCalledWith('react-resizable-panels:test-group-id:foo:bar');
			expect(storage.setItem).not.toHaveBeenCalled();

			result.current.onLayoutChange({
				foo: 35,
				bar: 65,
			});
			expect(storage.setItem).toHaveBeenCalledTimes(1);
			expect(storage.setItem).toHaveBeenCalledWith(
				'react-resizable-panels:test-group-id:foo:bar',
				JSON.stringify({
					foo: 35,
					bar: 65,
				}),
			);

			// This test verifies two things:
			// 1. Panel layout is saved separately
			// 2. Panel ids in the Layout are prioritized over those in the prop
			result.current.onLayoutChange({
				foo: 25,
				bar: 55,
				baz: 20,
			});
			expect(storage.setItem).toHaveBeenCalledTimes(2);
			expect(storage.setItem).toHaveBeenCalledWith(
				'react-resizable-panels:test-group-id:foo:bar:baz',
				JSON.stringify({
					foo: 25,
					bar: 55,
					baz: 20,
				}),
			);
		});

		// Fidelity classification: mechanically adapted (framework harness/imports only).\n
		test('should ignore invalid layouts (panel ids mismatch)', () => {
			setDefaultElementBounds(new DOMRect(0, 0, 100, 50));

			const groupRef = createRef<GroupImperativeHandle>();

			render(
				<Group
					defaultLayout={{
						foo: 40,
						bar: 60,
					}}
					groupRef={groupRef}
				>
					<Panel id="bar" defaultSize="30%" />
					<Panel id="baz" />
				</Group>,
			);

			expect(groupRef.current?.getLayout()).toMatchInlineSnapshot(
				`
      {
        "bar": 30,
        "baz": 70,
      }
    `,
			);
		});
	});

	// Test edge case where users spread the result of this method
	// Fidelity classification: mechanically adapted (framework harness/imports only).
	test('should only write once if both onLayoutChange and onLayoutChanged props are used', () => {
		vi.useFakeTimers();

		const storage: LayoutStorage = {
			getItem: vi.fn(() => null),
			setItem: vi.fn(),
		};

		const { result } = renderHook(
			() => useDefaultLayout({
				debounceSaveMs: 150,
				id: 'test-group-id',
				storage,
			}),
		);

		expect(result.current.defaultLayout).toMatchInlineSnapshot(`undefined`);
		expect(storage.setItem).not.toHaveBeenCalled();

		result.current.onLayoutChange({
			bar: 35,
			baz: 65,
		});
		result.current.onLayoutChanged(
			{
				bar: 35,
				baz: 65,
			},
			{ isUserInteraction: false },
		);

		expect(storage.setItem).toHaveBeenCalledTimes(1);
		expect(storage.setItem).toHaveBeenCalledWith(
			'react-resizable-panels:test-group-id',
			JSON.stringify({
				bar: 35,
				baz: 65,
			}),
		);

		vi.advanceTimersByTime(150);

		expect(storage.setItem).toHaveBeenCalledTimes(1);
	});

	describe('legacy layout fallback', () => {
		function mockLayoutStorage({
			groupId,
			legacyLayout = {
				'left,right': {
					expandToSizes: {},
					layout: [50, 50],
				},
				'center,left,right': {
					expandToSizes: {},
					layout: [33, 33, 34],
				},
			},
			matchV3,
			matchV4,
			modernLayout = {
				left: 25,
				center: 35,
				right: 40,
			},
			panelIds,
		}: {
			groupId: string;
			legacyLayout?: LegacyLayout;
			matchV3?: boolean;
			matchV4?: boolean;
			modernLayout?: Layout;
			panelIds?: string[] | undefined;
		}) {
			const keyV3 = getStorageKey(groupId, []);
			const keyV4 = getStorageKey(groupId, panelIds ?? []);

			const storage: LayoutStorage = {
				getItem: vi.fn((key) => {
					if (matchV4 && key === keyV4) {
						return JSON.stringify(modernLayout);
					} else if (matchV3 && key === keyV3) {
						return JSON.stringify(legacyLayout);
					} else {
						return null;
					}
				}),
				setItem: vi.fn(),
			};

			return {
				keyV3,
				keyV4,
				storage,
			};
		}

		describe('with panel ids prop', () => {
			// Fidelity classification: mechanically adapted (framework harness/imports only).
			test('skips mismatched legacy layout', () => {
				const { keyV3, keyV4, storage } = mockLayoutStorage({
					groupId: 'test-group-id',
					matchV3: true,
					panelIds: ['left', 'center'],
				});

				const { result } = renderHook(
					() => useDefaultLayout({
						id: 'test-group-id',
						panelIds: ['left', 'center'],
						storage,
					}),
				);

				expect(result.current.defaultLayout).toMatchInlineSnapshot(`undefined`);
				expect(storage.getItem).toHaveBeenCalledWith(keyV4);
				expect(storage.getItem).toHaveBeenCalledWith(keyV3);
				expect(storage.setItem).not.toHaveBeenCalled();
			});

			// Fidelity classification: mechanically adapted (framework harness/imports only).\n
			test('returns matching legacy layout', () => {
				const { keyV3, keyV4, storage } = mockLayoutStorage({
					groupId: 'test-group-id',
					matchV3: true,
					panelIds: ['left', 'right'],
				});

				const { result } = renderHook(
					() => useDefaultLayout({
						id: 'test-group-id',
						panelIds: ['left', 'right'],
						storage,
					}),
				);

				expect(result.current.defaultLayout).toMatchInlineSnapshot(
					`
          {
            "left": 50,
            "right": 50,
          }
        `,
				);
				expect(storage.getItem).toHaveBeenCalledWith(keyV4);
				expect(storage.getItem).toHaveBeenCalledWith(keyV3);
				expect(storage.setItem).not.toHaveBeenCalled();
			});

			// Fidelity classification: mechanically adapted (framework harness/imports only).\n
			test('prefers matching modern layouts if both are present', () => {
				const { keyV3, keyV4, storage } = mockLayoutStorage({
					groupId: 'test-group-id',
					matchV3: true,
					matchV4: true,
					panelIds: ['left', 'center', 'right'],
				});

				const { result } = renderHook(
					() => useDefaultLayout({
						id: 'test-group-id',
						panelIds: ['left', 'center', 'right'],
						storage,
					}),
				);

				expect(result.current.defaultLayout).toMatchInlineSnapshot(
					`
          {
            "center": 35,
            "left": 25,
            "right": 40,
          }
        `,
				);
				expect(storage.getItem).toHaveBeenCalledWith(keyV4);
				expect(storage.getItem).not.toHaveBeenCalledWith(keyV3);
				expect(storage.setItem).not.toHaveBeenCalled();
			});
		});

		describe('without panel ids prop', () => {
			// Fidelity classification: mechanically adapted (framework harness/imports only).
			test('skips mismatched legacy layout', () => {
				const { keyV3, keyV4, storage } = mockLayoutStorage({
					groupId: 'test-group-id',
					matchV3: true,
				});

				const { result } = renderHook(
					() => useDefaultLayout({
						id: 'test-group-id',
						storage,
					}),
				);

				expect(result.current.defaultLayout).toMatchInlineSnapshot(`undefined`);
				expect(storage.getItem).toHaveBeenCalledWith(keyV4);
				expect(storage.getItem).toHaveBeenCalledWith(keyV3);
				expect(storage.setItem).not.toHaveBeenCalled();
			});

			// Fidelity classification: mechanically adapted (framework harness/imports only).\n
			test('returns matching legacy layout', () => {
				const { keyV3, keyV4, storage } = mockLayoutStorage({
					groupId: 'test-group-id',
					legacyLayout: {
						'center,right': {
							expandToSizes: {},
							layout: [50, 50],
						},
					},
					matchV3: true,
				});

				const { result } = renderHook(
					() => useDefaultLayout({
						id: 'test-group-id',
						storage,
					}),
				);

				expect(result.current.defaultLayout).toMatchInlineSnapshot(
					`
          {
            "center": 50,
            "right": 50,
          }
        `,
				);
				expect(storage.getItem).toHaveBeenCalledWith(keyV4);
				expect(storage.getItem).toHaveBeenCalledWith(keyV3);
				expect(storage.setItem).not.toHaveBeenCalled();
			});

			// Fidelity classification: mechanically adapted (framework harness/imports only).\n
			test('prefers matching modern layouts if both are present', () => {
				const { keyV4, storage } = mockLayoutStorage({
					groupId: 'test-group-id',
					matchV3: true,
					matchV4: true,
				});

				const { result } = renderHook(
					() => useDefaultLayout({
						id: 'test-group-id',
						storage,
					}),
				);

				expect(result.current.defaultLayout).toMatchInlineSnapshot(
					`
          {
            "center": 35,
            "left": 25,
            "right": 40,
          }
        `,
				);
				expect(storage.getItem).toHaveBeenCalledWith(keyV4);
				expect(storage.setItem).not.toHaveBeenCalled();
			});
		});

		// Fidelity classification: mechanically adapted (framework harness/imports only).\n
		test('updates persisted modern layout', () => {
			const { keyV3, keyV4, storage } = mockLayoutStorage({
				groupId: 'test-group-id',
				matchV3: true,
				panelIds: ['left', 'right'],
			});

			const { result } = renderHook(
				() => useDefaultLayout({
					id: 'test-group-id',
					panelIds: ['left', 'right'],
					storage,
				}),
			);

			expect(result.current.defaultLayout).toMatchInlineSnapshot(
				`
        {
          "left": 50,
          "right": 50,
        }
      `,
			);
			expect(storage.getItem).toHaveBeenCalledWith(keyV4);
			expect(storage.getItem).toHaveBeenCalledWith(keyV3);
			expect(storage.setItem).not.toHaveBeenCalled();

			result.current.onLayoutChanged(
				{
					left: 35,
					right: 65,
				},
				{ isUserInteraction: false },
			);

			expect(storage.setItem).toHaveBeenCalledTimes(1);
			expect(storage.setItem).toHaveBeenCalledWith(
				keyV4,
				JSON.stringify({
					left: 35,
					right: 65,
				}),
			);
		});
	});
});
