/**
 * Adapted one-for-one from upstream/test/browser/waypoint_test.jsx for Octane.
 * // Per packages/waypoint/upstream/test/browser/waypoint_test.jsx
 */
import React, { ReactDOM, useState } from './octane-react-shim.js';
import { Waypoint } from '@octanejs/waypoint';

const refNotUsedErrorMessage = 'OCTANE_REF_CONTRACT';
const WRAPPER_TICK_SLOT = Symbol('waypoint-adapted-wrapper-tick');

let div;

function renderAttached(component) {
	div = document.createElement('div');
	document.body.appendChild(div);
	const renderedComponent = ReactDOM.render(component, div);
	return renderedComponent;
}

function scrollNodeTo(node, scrollTop) {
	if (node === window) {
		{
			document.documentElement.scrollTop = scrollTop;
			document.body.scrollTop = scrollTop;
			window.scrollTo(0, scrollTop);
		}
	} else {
		// eslint-disable-next-line no-param-reassign
		node.scrollTop = scrollTop;
	}
	const event = document.createEvent('Event');
	event.initEvent('scroll', false, false);
	node.dispatchEvent(event);
}

describe('<Waypoint>', () => {
	let props;
	let margin;
	let parentHeight;
	let parentStyle;
	let topSpacerHeight;
	let bottomSpacerHeight;
	let subject;

	beforeEach(() => {
		jasmine.clock().install();
		spyOn(console, 'log');
		props = {
			onEnter: jasmine.createSpy('onEnter'),
			onLeave: jasmine.createSpy('onLeave'),
			onPositionChange: jasmine.createSpy('onPositionChange'),
		};

		margin = 10;
		parentHeight = 100;

		parentStyle = {
			height: parentHeight,
			overflow: 'auto',
			position: 'relative',
			width: 100,
			margin, // Normalize the space above the viewport.
		};

		topSpacerHeight = 0;
		bottomSpacerHeight = 0;

		subject = () => {
			const el = renderAttached(
				<div style={parentStyle}>
					<div style={{ height: topSpacerHeight }} />
					<Waypoint {...props} />
					<div style={{ height: bottomSpacerHeight }} />
				</div>,
			);

			jasmine.clock().tick(1);
			return el;
		};
	});

	afterEach(() => {
		if (div) {
			ReactDOM.unmountComponentAtNode(div);
		}
		scrollNodeTo(window, 0);
		jasmine.clock().uninstall();
	});

	// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:83
	it('logs to the console when called with debug = true', () => {
		props.debug = true;
		subject();
		expect(console.log).toHaveBeenCalled(); // eslint-disable-line no-console
	});

	describe('when the Waypoint is visible on mount', () => {
		beforeEach(() => {
			topSpacerHeight = 90;
			bottomSpacerHeight = 200;
			subject();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:96
		it('does not log to the console', () => {
			// eslint-disable-next-line no-console
			expect(console.log).not.toHaveBeenCalled();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:101
		it('calls the onEnter handler', () => {
			expect(props.onEnter).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: undefined,
				event: null,
				waypointTop: margin + topSpacerHeight,
				waypointBottom: margin + topSpacerHeight,
				viewportTop: margin,
				viewportBottom: margin + parentHeight,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:113
		it('calls the onPositionChange handler', () => {
			expect(props.onPositionChange).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: undefined,
				event: null,
				waypointTop: margin + topSpacerHeight,
				waypointBottom: margin + topSpacerHeight,
				viewportTop: margin,
				viewportBottom: margin + parentHeight,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:126
		it('does not call the onLeave handler', () => {
			expect(props.onLeave).not.toHaveBeenCalled();
		});
	});

	describe('when the Waypoint is visible on mount and has topOffset < -100%', () => {
		beforeEach(() => {
			props.topOffset = '-200%';

			topSpacerHeight = 90;
			bottomSpacerHeight = 200;
			subject();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:140
		it('calls the onEnter handler', () => {
			expect(props.onEnter).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: undefined,
				event: null,
				waypointTop: margin + topSpacerHeight,
				waypointBottom: margin + topSpacerHeight,
				viewportTop: margin - parentHeight * 2,
				viewportBottom: margin + parentHeight,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:152
		it('calls the onPositionChange handler', () => {
			expect(props.onPositionChange).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: undefined,
				event: null,
				waypointTop: margin + topSpacerHeight,
				waypointBottom: margin + topSpacerHeight,
				viewportTop: margin - parentHeight * 2,
				viewportBottom: margin + parentHeight,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:165
		it('does not call the onLeave handler', () => {
			expect(props.onLeave).not.toHaveBeenCalled();
		});
	});

	describe('when the Waypoint is visible on mount and has bottomOffset < -100%', () => {
		beforeEach(() => {
			props.bottomOffset = '-200%';

			topSpacerHeight = 90;
			bottomSpacerHeight = 200;
			subject();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:179
		it('calls the onEnter handler', () => {
			expect(props.onEnter).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: undefined,
				event: null,
				waypointTop: margin + topSpacerHeight,
				waypointBottom: margin + topSpacerHeight,
				viewportTop: margin,
				viewportBottom: margin + parentHeight * 3,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:191
		it('calls the onPositionChange handler', () => {
			expect(props.onPositionChange).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: undefined,
				event: null,
				waypointTop: margin + topSpacerHeight,
				waypointBottom: margin + topSpacerHeight,
				viewportTop: margin,
				viewportBottom: margin + parentHeight * 3,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:204
		it('does not call the onLeave handler', () => {
			expect(props.onLeave).not.toHaveBeenCalled();
		});
	});

	describe('when the Waypoint is visible on mount and offsets < -100%', () => {
		beforeEach(() => {
			props.topOffset = '-200%';
			props.bottomOffset = '-200%';

			topSpacerHeight = 90;
			bottomSpacerHeight = 200;
			subject();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:219
		it('calls the onEnter handler', () => {
			expect(props.onEnter).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: undefined,
				event: null,
				waypointTop: margin + topSpacerHeight,
				waypointBottom: margin + topSpacerHeight,
				viewportTop: margin - parentHeight * 2,
				viewportBottom: margin + parentHeight * 3,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:231
		it('calls the onPositionChange handler', () => {
			expect(props.onPositionChange).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: undefined,
				event: null,
				waypointTop: margin + topSpacerHeight,
				waypointBottom: margin + topSpacerHeight,
				viewportTop: margin - parentHeight * 2,
				viewportBottom: margin + parentHeight * 3,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:244
		it('does not call the onLeave handler', () => {
			expect(props.onLeave).not.toHaveBeenCalled();
		});
	});

	describe('when scrolling while the waypoint is visible', () => {
		let parentComponent;
		let scrollable;

		beforeEach(() => {
			topSpacerHeight = 90;
			bottomSpacerHeight = 200;
			parentComponent = subject();
			scrollable = parentComponent;
			scrollNodeTo(scrollable, topSpacerHeight / 2);
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:261
		it('does not call the onEnter handler again', () => {
			expect(props.onEnter.calls.count()).toBe(1);
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:265
		it('does not call the onLeave handler', () => {
			expect(props.onLeave).not.toHaveBeenCalled();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:269
		it('does not call the onPositionChange handler again', () => {
			expect(props.onPositionChange.calls.count()).toBe(1);
		});
	});

	describe('when scrolling past the waypoint while it is visible', () => {
		let parentComponent;
		let scrollable;

		beforeEach(() => {
			topSpacerHeight = 90;
			bottomSpacerHeight = 200;
			parentComponent = subject();
			scrollable = parentComponent;
			scrollNodeTo(scrollable, topSpacerHeight + 10);
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:286
		it('the onLeave handler is called', () => {
			expect(props.onLeave).toHaveBeenCalledWith({
				currentPosition: Waypoint.above,
				previousPosition: Waypoint.inside,
				event: jasmine.any(Event),
				waypointTop: margin - 10,
				waypointBottom: margin - 10,
				viewportTop: margin,
				viewportBottom: margin + parentHeight,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:299
		it('does not call the onEnter handler', () => {
			expect(props.onEnter.calls.count()).toBe(1);
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:303
		it('the onPositionChange is called', () => {
			expect(props.onPositionChange).toHaveBeenCalledWith({
				currentPosition: Waypoint.above,
				previousPosition: Waypoint.inside,
				event: jasmine.any(Event),
				waypointTop: margin - 10,
				waypointBottom: margin - 10,
				viewportTop: margin,
				viewportBottom: margin + parentHeight,
			});
		});
	});

	describe('when the Waypoint is below the bottom', () => {
		beforeEach(() => {
			topSpacerHeight = 200;

			// The bottom spacer needs to be tall enough to force the Waypoint to exit
			// the viewport when scrolled all the way down.
			bottomSpacerHeight = 3000;
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:326
		it('does not call the onEnter handler on mount', () => {
			subject();
			expect(props.onEnter).not.toHaveBeenCalled();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:331
		it('does not call the onLeave handler on mount', () => {
			subject();
			expect(props.onLeave).not.toHaveBeenCalled();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:336
		it('calls the onPositionChange handler', () => {
			subject();
			expect(props.onPositionChange).toHaveBeenCalledWith({
				currentPosition: Waypoint.below,
				previousPosition: undefined,
				event: null,
				waypointTop: margin + topSpacerHeight,
				waypointBottom: margin + topSpacerHeight,
				viewportTop: margin,
				viewportBottom: margin + parentHeight,
			});
		});

		describe('with children', () => {
			let childrenHeight;

			beforeEach(() => {
				childrenHeight = 80;
				props.children = (
					<div>
						<div style={{ height: childrenHeight / 2 }} />
						<div style={{ height: childrenHeight / 2 }} />
					</div>
				);
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:363
			it('calls the onEnter handler when scrolling down far enough', () => {
				const component = subject();
				props.onPositionChange.calls.reset();
				scrollNodeTo(component, 100);

				expect(props.onEnter).toHaveBeenCalledWith({
					currentPosition: Waypoint.inside,
					previousPosition: Waypoint.below,
					event: jasmine.any(Event),
					waypointTop: margin + topSpacerHeight - 100,
					waypointBottom: margin + topSpacerHeight - 100 + childrenHeight,
					viewportTop: margin,
					viewportBottom: margin + parentHeight,
				});
			});
		});

		describe('when scrolling down just below the threshold', () => {
			let component;

			beforeEach(() => {
				component = subject();
				props.onPositionChange.calls.reset();
				scrollNodeTo(component, 99);
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:390
			it('does not call the onEnter handler', () => {
				expect(props.onEnter).not.toHaveBeenCalled();
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:394
			it('does not call the onLeave handler', () => {
				expect(props.onLeave).not.toHaveBeenCalled();
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:398
			it('does not call the onPositionChange handler', () => {
				expect(props.onPositionChange).not.toHaveBeenCalled();
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:403
		it('calls the onEnter handler when scrolling down past the threshold', () => {
			scrollNodeTo(subject(), 100);

			expect(props.onEnter).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: Waypoint.below,
				event: jasmine.any(Event),
				waypointTop: margin + topSpacerHeight - 100,
				waypointBottom: margin + topSpacerHeight - 100,
				viewportTop: margin,
				viewportBottom: margin + parentHeight,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:418
		it('calls the onPositionChange handler when scrolling down past the threshold', () => {
			scrollNodeTo(subject(), 100);

			expect(props.onPositionChange).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: Waypoint.below,
				event: jasmine.any(Event),
				waypointTop: margin + topSpacerHeight - 100,
				waypointBottom: margin + topSpacerHeight - 100,
				viewportTop: margin,
				viewportBottom: margin + parentHeight,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:433
		it('does not call the onLeave handler when scrolling down past the threshold', () => {
			scrollNodeTo(subject(), 100);
			expect(props.onLeave).not.toHaveBeenCalled();
		});

		describe('when `fireOnRapidScroll` is disabled', () => {
			beforeEach(() => {
				props.fireOnRapidScroll = false;
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:443
			it('calls the onEnter handler when scrolling down past the threshold', () => {
				scrollNodeTo(subject(), 100);

				expect(props.onEnter).toHaveBeenCalledWith({
					currentPosition: Waypoint.inside,
					previousPosition: Waypoint.below,
					event: jasmine.any(Event),
					waypointTop: margin + topSpacerHeight - 100,
					waypointBottom: margin + topSpacerHeight - 100,
					viewportTop: margin,
					viewportBottom: margin + parentHeight,
				});
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:458
			it('calls the onPositionChange handler when scrolling down past the threshold', () => {
				scrollNodeTo(subject(), 100);

				expect(props.onPositionChange).toHaveBeenCalledWith({
					currentPosition: Waypoint.inside,
					previousPosition: Waypoint.below,
					event: jasmine.any(Event),
					waypointTop: margin + topSpacerHeight - 100,
					waypointBottom: margin + topSpacerHeight - 100,
					viewportTop: margin,
					viewportBottom: margin + parentHeight,
				});
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:473
			it('does not call the onLeave handler when scrolling down past the threshold', () => {
				scrollNodeTo(subject(), 100);

				expect(props.onLeave).not.toHaveBeenCalled();
			});
		});

		describe('when scrolling quickly past the waypoint', () => {
			let scrollQuicklyPast;
			let component;

			// If you scroll really fast, we might not get a scroll event when the
			// waypoint is in view. We will get a scroll event before going into view
			// though, and one after. We want to treat this as if the waypoint was
			// visible for a brief moment, and so we fire both onEnter and onLeave.
			beforeEach(() => {
				scrollQuicklyPast = () => {
					component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, topSpacerHeight + bottomSpacerHeight);
				};
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:496
			it('calls the onEnter handler', () => {
				scrollQuicklyPast();
				expect(props.onEnter).toHaveBeenCalledWith({
					currentPosition: Waypoint.inside,
					previousPosition: Waypoint.below,
					event: jasmine.any(Event),
					waypointTop: margin - bottomSpacerHeight + parentHeight,
					waypointBottom: margin - bottomSpacerHeight + parentHeight,
					viewportTop: margin,
					viewportBottom: margin + parentHeight,
				});
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:510
			it('calls the onLeave handler', () => {
				scrollQuicklyPast();
				expect(props.onLeave).toHaveBeenCalledWith({
					currentPosition: Waypoint.above,
					previousPosition: Waypoint.inside,
					event: jasmine.any(Event),
					waypointTop: margin - bottomSpacerHeight + parentHeight,
					waypointBottom: margin - bottomSpacerHeight + parentHeight,
					viewportTop: margin,
					viewportBottom: margin + parentHeight,
				});
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:524
			it('calls the onPositionChange handler', () => {
				scrollQuicklyPast();
				expect(props.onPositionChange).toHaveBeenCalledWith({
					currentPosition: Waypoint.above,
					previousPosition: Waypoint.below,
					event: jasmine.any(Event),
					waypointTop: margin - bottomSpacerHeight + parentHeight,
					waypointBottom: margin - bottomSpacerHeight + parentHeight,
					viewportTop: margin,
					viewportBottom: margin + parentHeight,
				});
			});

			describe('when `fireOnRapidScroll` is disabled', () => {
				beforeEach(() => {
					props.fireOnRapidScroll = false;
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:543
				it('does not call the onEnter handler', () => {
					scrollQuicklyPast();
					expect(props.onEnter).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:548
				it('does not call the onLeave handler', () => {
					scrollQuicklyPast();
					expect(props.onLeave).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:553
				it('calls the onPositionChange handler', () => {
					scrollQuicklyPast();
					expect(props.onPositionChange).toHaveBeenCalledWith({
						currentPosition: Waypoint.above,
						previousPosition: Waypoint.below,
						event: jasmine.any(Event),
						waypointTop: margin - bottomSpacerHeight + parentHeight,
						waypointBottom: margin - bottomSpacerHeight + parentHeight,
						viewportTop: margin,
						viewportBottom: margin + parentHeight,
					});
				});
			});
		});

		describe('with a non-zero topOffset', () => {
			describe('and the topOffset is passed as a percentage', () => {
				beforeEach(() => {
					props.topOffset = '-10%';
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:575
				it('calls the onLeave handler when scrolling down past the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 211);

					expect(props.onLeave).toHaveBeenCalledWith({
						currentPosition: Waypoint.above,
						previousPosition: Waypoint.inside,
						event: jasmine.any(Event),
						waypointTop: margin + topSpacerHeight - 211,
						waypointBottom: margin + topSpacerHeight - 211,
						viewportTop: margin + parentHeight * -0.1,
						viewportBottom: margin + parentHeight,
					});
				});
			});
		});

		describe('with a non-zero bottomOffset', () => {
			describe('and the bottomOffset is passed as a percentage', () => {
				beforeEach(() => {
					props.bottomOffset = '-10%';
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:600
				it('does not call the onEnter handler when scrolling down near the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 89);

					expect(props.onEnter).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:608
				it('does not call the onLeave handler when scrolling down near the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 89);

					expect(props.onLeave).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:616
				it('does not call onPositionChange handler when scrolling down near bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 89);

					expect(props.onPositionChange).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:624
				it('calls the onEnter handler when scrolling down past the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 90);

					expect(props.onEnter).toHaveBeenCalledWith({
						currentPosition: Waypoint.inside,
						previousPosition: Waypoint.below,
						event: jasmine.any(Event),
						waypointTop: margin + topSpacerHeight - 90,
						waypointBottom: margin + topSpacerHeight - 90,
						viewportTop: margin,
						viewportBottom: margin + Math.floor(parentHeight * 1.1),
					});
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:641
				it('does not call the onLeave handler when scrolling down past the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 90);

					expect(props.onLeave).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:649
				it('calls the onPositionChange handler when scrolling down past the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 90);

					expect(props.onPositionChange).toHaveBeenCalledWith({
						currentPosition: Waypoint.inside,
						previousPosition: Waypoint.below,
						event: jasmine.any(Event),
						waypointTop: margin + topSpacerHeight - 90,
						waypointBottom: margin + topSpacerHeight - 90,
						viewportTop: margin,
						viewportBottom: margin + Math.floor(parentHeight * 1.1),
					});
				});
			});

			describe('and the bottom offset is passed as a numeric string', () => {
				beforeEach(() => {
					props.bottomOffset = '-10';
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:672
				it('does not call the onEnter handler when scrolling down near the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 89);

					expect(props.onEnter).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:680
				it('does not call the onLeave handler when scrolling down near the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 89);

					expect(props.onLeave).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:688
				it('does not call onPositionChange handler when scrolling down near bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 89);

					expect(props.onPositionChange).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:696
				it('calls the onEnter handler when scrolling down past the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 90);

					expect(props.onEnter).toHaveBeenCalledWith({
						currentPosition: Waypoint.inside,
						previousPosition: Waypoint.below,
						event: jasmine.any(Event),
						waypointTop: margin + topSpacerHeight - 90,
						waypointBottom: margin + topSpacerHeight - 90,
						viewportTop: margin,
						viewportBottom: margin + parentHeight + 10,
					});
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:713
				it('does not call the onLeave handler when scrolling down past the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 90);

					expect(props.onLeave).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:721
				it('calls the onPositionChange handler when scrolling down past the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 90);

					expect(props.onPositionChange).toHaveBeenCalledWith({
						currentPosition: Waypoint.inside,
						previousPosition: Waypoint.below,
						event: jasmine.any(Event),
						waypointTop: margin + topSpacerHeight - 90,
						waypointBottom: margin + topSpacerHeight - 90,
						viewportTop: margin,
						viewportBottom: margin + parentHeight + 10,
					});
				});
			});

			describe('and the bottom offset is passed as a pixel string', () => {
				beforeEach(() => {
					props.bottomOffset = '-10px';
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:744
				it('does not call the onEnter handler when scrolling down near the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 89);

					expect(props.onEnter).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:752
				it('does not call the onLeave handler when scrolling down near the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 89);

					expect(props.onLeave).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:760
				it('does not call onPositionChange handler when scrolling down near bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 89);

					expect(props.onPositionChange).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:768
				it('calls the onEnter handler when scrolling down past the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 90);

					expect(props.onEnter).toHaveBeenCalledWith({
						currentPosition: Waypoint.inside,
						previousPosition: Waypoint.below,
						event: jasmine.any(Event),
						waypointTop: margin + topSpacerHeight - 90,
						waypointBottom: margin + topSpacerHeight - 90,
						viewportTop: margin,
						viewportBottom: margin + parentHeight + 10,
					});
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:785
				it('does not call the onLeave handler when scrolling down past the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 90);

					expect(props.onLeave).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:793
				it('calls the onPositionChange handler when scrolling down past the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 90);

					expect(props.onPositionChange).toHaveBeenCalledWith({
						currentPosition: Waypoint.inside,
						previousPosition: Waypoint.below,
						event: jasmine.any(Event),
						waypointTop: margin + topSpacerHeight - 90,
						waypointBottom: margin + topSpacerHeight - 90,
						viewportTop: margin,
						viewportBottom: margin + parentHeight + 10,
					});
				});
			});

			describe('and the bottom offset is passed as a number', () => {
				beforeEach(() => {
					props.bottomOffset = -10;
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:816
				it('does not call the onEnter handler when scrolling down near the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 89);

					expect(props.onEnter).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:824
				it('does not call the onLeave handler when scrolling down near the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 89);

					expect(props.onLeave).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:832
				it('does not call onPositionChange handler when scrolling down near bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 89);

					expect(props.onPositionChange).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:840
				it('calls the onEnter handler when scrolling down past the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 90);

					expect(props.onEnter).toHaveBeenCalledWith({
						currentPosition: Waypoint.inside,
						previousPosition: Waypoint.below,
						event: jasmine.any(Event),
						waypointTop: margin + topSpacerHeight - 90,
						waypointBottom: margin + topSpacerHeight - 90,
						viewportTop: margin,
						viewportBottom: margin + parentHeight + 10,
					});
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:857
				it('does not call the onLeave handler when scrolling down past the bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 90);

					expect(props.onLeave).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:865
				it('calls onPositionChange handler when scrolling down past bottom offset', () => {
					const component = subject();
					props.onPositionChange.calls.reset();
					scrollNodeTo(component, 90);

					expect(props.onPositionChange).toHaveBeenCalledWith({
						currentPosition: Waypoint.inside,
						previousPosition: Waypoint.below,
						event: jasmine.any(Event),
						waypointTop: margin + topSpacerHeight - 90,
						waypointBottom: margin + topSpacerHeight - 90,
						viewportTop: margin,
						viewportBottom: margin + parentHeight + 10,
					});
				});
			});
		});
	});

	describe('when the Waypoint has children', () => {
		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:886
		it('does not throw with a DOM Element as a child', () => {
			props.children = <div />;
			expect(subject).not.toThrow();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:891
		it('does not throw with a Stateful Component as a child', () => {
			function StatefulComponent(props) {
				return <div ref={props.ref} />;
			}

			props.children = <StatefulComponent />;
			expect(subject).not.toThrow();
			// OCTANE DIVERGENCE[waypoint-ref-child-forward]: Waypoint injects ref (not innerRef); assert measurement so a non-forwarding child cannot pass.
			expect(props.onPositionChange).toHaveBeenCalled();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:903
		it('errors when a Stateful Component does not provide ref to Waypoint', () => {
			function StatefulComponent() {
				return <div />;
			}

			props.children = <StatefulComponent />;
			// OCTANE DIVERGENCE[waypoint-ref-child-contract][runtime:0f5696c86cdcf34e]: refs-as-props; missing child ref does not throw ensureRefIsUsedByChild.
			expect(subject).not.toThrow();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:915
		it('does not throw with a Stateless Component as a child', () => {
			function StatelessComponent(props) {
				return <div ref={props.ref} />;
			}

			props.children = <StatelessComponent />;
			expect(subject).not.toThrow();
			// OCTANE DIVERGENCE[waypoint-ref-child-forward]: Waypoint injects ref (not innerRef); assert measurement so a non-forwarding child cannot pass.
			expect(props.onPositionChange).toHaveBeenCalled();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:922
		it('errors when a Stateless Component does not provide ref to Waypoint', () => {
			function StatelessComponent() {
				return <div />;
			}

			props.children = <StatelessComponent />;
			// OCTANE DIVERGENCE[waypoint-ref-child-contract][runtime:3098ae49fcaaf40e]: refs-as-props; missing child ref does not throw ensureRefIsUsedByChild.
			expect(subject).not.toThrow();
		});
	});

	describe('when the Waypoint has children and is above the top', () => {
		let childrenHeight;
		let scrollable;

		beforeEach(() => {
			topSpacerHeight = 200;
			bottomSpacerHeight = 200;
			childrenHeight = 100;
			props.children = <div style={{ height: childrenHeight }} />;
			scrollable = subject();

			// Because of how we detect when a Waypoint is scrolled past without any
			// scroll event fired when it was visible, we need to reset callback
			// spies.
			scrollNodeTo(scrollable, 400);
			props.onEnter.calls.reset();
			props.onLeave.calls.reset();
			scrollNodeTo(scrollable, 400);
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:950
		it('does not call the onEnter handler', () => {
			expect(props.onEnter).not.toHaveBeenCalled();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:954
		it('does not call the onLeave handler', () => {
			expect(props.onLeave).not.toHaveBeenCalled();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:958
		it('calls the onEnter handler when scrolled back up just past the bottom', () => {
			scrollNodeTo(scrollable, topSpacerHeight + 50);

			expect(props.onEnter).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: Waypoint.above,
				event: jasmine.any(Event),
				waypointTop: -40,
				waypointBottom: -40 + childrenHeight,
				viewportTop: margin,
				viewportBottom: margin + parentHeight,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:973
		it('does not call the onLeave handler when scrolled back up just past the bottom', () => {
			scrollNodeTo(scrollable, topSpacerHeight + 50);

			expect(props.onLeave).not.toHaveBeenCalled();
		});
	});

	describe('when the Waypoint is above the top', () => {
		let scrollable;

		beforeEach(() => {
			topSpacerHeight = 200;
			bottomSpacerHeight = 200;
			scrollable = subject();

			// Because of how we detect when a Waypoint is scrolled past without any
			// scroll event fired when it was visible, we need to reset callback
			// spies.
			scrollNodeTo(scrollable, 400);
			props.onEnter.calls.reset();
			props.onLeave.calls.reset();
			props.onPositionChange.calls.reset();
			scrollNodeTo(scrollable, 400);
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:998
		it('does not call the onEnter handler', () => {
			expect(props.onEnter).not.toHaveBeenCalled();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1002
		it('does not call the onLeave handler', () => {
			expect(props.onLeave).not.toHaveBeenCalled();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1006
		it('does not call the onPositionChange handler', () => {
			expect(props.onPositionChange).not.toHaveBeenCalled();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1010
		it('does not call the onEnter handler when scrolling up not past the threshold', () => {
			scrollNodeTo(scrollable, 201);

			expect(props.onEnter).not.toHaveBeenCalled();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1016
		it('does not call the onLeave handler when scrolling up not past the threshold', () => {
			scrollNodeTo(scrollable, 201);

			expect(props.onLeave).not.toHaveBeenCalled();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1022
		it('does not call onPositionChange handler when scrolling up not past the threshold', () => {
			scrollNodeTo(scrollable, 201);

			expect(props.onPositionChange).not.toHaveBeenCalled();
		});

		describe('when scrolling up past the threshold', () => {
			beforeEach(() => {
				scrollNodeTo(scrollable, 200);
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1033
			it('calls the onEnter handler', () => {
				expect(props.onEnter).toHaveBeenCalledWith({
					currentPosition: Waypoint.inside,
					previousPosition: Waypoint.above,
					event: jasmine.any(Event),
					waypointTop: margin + topSpacerHeight - 200,
					waypointBottom: margin + topSpacerHeight - 200,
					viewportTop: margin,
					viewportBottom: margin + parentHeight,
				});
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1046
			it('does not call the onLeave handler', () => {
				expect(props.onLeave).not.toHaveBeenCalled();
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1050
			it('calls the onPositionChange handler', () => {
				expect(props.onPositionChange).toHaveBeenCalledWith({
					currentPosition: Waypoint.inside,
					previousPosition: Waypoint.above,
					event: jasmine.any(Event),
					waypointTop: margin + topSpacerHeight - 200,
					waypointBottom: margin + topSpacerHeight - 200,
					viewportTop: margin,
					viewportBottom: margin + parentHeight,
				});
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1063
			it('calls the onLeave handler when scrolling up past the waypoint', () => {
				scrollNodeTo(scrollable, 99);

				expect(props.onLeave).toHaveBeenCalledWith({
					currentPosition: Waypoint.below,
					previousPosition: Waypoint.inside,
					event: jasmine.any(Event),
					waypointTop: margin + topSpacerHeight - 99,
					waypointBottom: margin + topSpacerHeight - 99,
					viewportTop: margin,
					viewportBottom: margin + parentHeight,
				});
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1078
			it('does not call the onEnter handler again when scrolling up past the waypoint', () => {
				scrollNodeTo(scrollable, 99);

				expect(props.onEnter.calls.count()).toBe(1);
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1084
			it('calls the onPositionChange handler when scrolling up past the waypoint', () => {
				scrollNodeTo(scrollable, 99);

				expect(props.onPositionChange).toHaveBeenCalledWith({
					currentPosition: Waypoint.below,
					previousPosition: Waypoint.inside,
					event: jasmine.any(Event),
					waypointTop: margin + topSpacerHeight - 99,
					waypointBottom: margin + topSpacerHeight - 99,
					viewportTop: margin,
					viewportBottom: margin + parentHeight,
				});
			});
		});

		describe('when scrolling up quickly past the waypoint', () => {
			// If you scroll really fast, we might not get a scroll event when the
			// waypoint is in view. We will get a scroll event before going into view
			// though, and one after. We want to treat this as if the waypoint was
			// visible for a brief moment, and so we fire both onEnter and onLeave.
			beforeEach(() => {
				scrollNodeTo(scrollable, 0);
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1109
			it('calls the onEnter handler', () => {
				expect(props.onEnter).toHaveBeenCalledWith({
					currentPosition: Waypoint.inside,
					previousPosition: Waypoint.above,
					event: jasmine.any(Event),
					waypointTop: margin + topSpacerHeight,
					waypointBottom: margin + topSpacerHeight,
					viewportTop: margin,
					viewportBottom: margin + parentHeight,
				});
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1122
			it('calls the onLeave handler', () => {
				expect(props.onLeave).toHaveBeenCalledWith({
					currentPosition: Waypoint.below,
					previousPosition: Waypoint.inside,
					event: jasmine.any(Event),
					waypointTop: margin + topSpacerHeight,
					waypointBottom: margin + topSpacerHeight,
					viewportTop: margin,
					viewportBottom: margin + parentHeight,
				});
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1135
			it('calls the onPositionChange handler', () => {
				expect(props.onPositionChange).toHaveBeenCalledWith({
					currentPosition: Waypoint.below,
					previousPosition: Waypoint.above,
					event: jasmine.any(Event),
					waypointTop: margin + topSpacerHeight,
					waypointBottom: margin + topSpacerHeight,
					viewportTop: margin,
					viewportBottom: margin + parentHeight,
				});
			});
		});
	});

	describe('when the scrollable parent is not displayed', () => {
		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1151
		it('calls the onLeave handler', () => {
			const component = subject();
			const node = ReactDOM.findDOMNode(component);
			node.style.display = 'none';
			scrollNodeTo(component, 0);
			expect(props.onLeave).toHaveBeenCalledWith({
				currentPosition: Waypoint.invisible,
				previousPosition: Waypoint.inside,
				event: jasmine.any(Event),
				waypointTop: 0,
				waypointBottom: 0,
				viewportTop: 0,
				viewportBottom: 0,
			});
		});
	});

	describe('when the window is the scrollable parent', () => {
		beforeEach(() => {
			// Make the normal parent non-scrollable
			parentStyle.height = 'auto';
			parentStyle.overflow = 'visible';

			// This is only here to try and confuse the _findScrollableAncestor code.
			document.body.style.overflow = 'auto';

			// Make the spacers large enough to make the Waypoint render off-screen
			topSpacerHeight = window.innerHeight + 1000;
			bottomSpacerHeight = 1000;
		});

		afterEach(() => {
			// Reset body style
			document.body.style.overflow = '';
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1188
		it('does not fire the onEnter handler on mount', () => {
			subject();
			expect(props.onEnter).not.toHaveBeenCalled();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1193
		it('fires the onPositionChange handler on mount', () => {
			subject();
			expect(props.onPositionChange).toHaveBeenCalledWith({
				currentPosition: Waypoint.below,
				previousPosition: undefined,
				event: null,
				waypointTop: margin + topSpacerHeight,
				waypointBottom: margin + topSpacerHeight,
				viewportTop: 0,
				viewportBottom: window.innerHeight,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1207
		it('fires the onEnter handler when the Waypoint is in view', () => {
			subject();
			scrollNodeTo(window, topSpacerHeight - window.innerHeight / 2);

			expect(props.onEnter).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: Waypoint.below,
				event: jasmine.any(Event),
				waypointTop: margin + Math.ceil(window.innerHeight / 2),
				waypointBottom: margin + Math.ceil(window.innerHeight / 2),
				viewportTop: 0,
				viewportBottom: window.innerHeight,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1223
		it('fires the onPositionChange handler when the Waypoint is in view', () => {
			subject();
			scrollNodeTo(window, topSpacerHeight - window.innerHeight / 2);

			expect(props.onPositionChange).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: Waypoint.below,
				event: jasmine.any(Event),
				waypointTop: margin + Math.ceil(window.innerHeight / 2),
				waypointBottom: margin + Math.ceil(window.innerHeight / 2),
				viewportTop: 0,
				viewportBottom: window.innerHeight,
			});
		});
	});

	// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1240
	it('does not throw an error when the <html> is the scrollable parent', () => {
		// Give the <html> an overflow style
		document.documentElement.style.overflow = 'auto';

		// Make the normal parent non-scrollable
		parentStyle.height = 'auto';
		parentStyle.overflow = 'visible';

		expect(subject).not.toThrow();

		delete document.documentElement.style.overflow;
	});

	describe('when the waypoint is updated in the onEnter callback', () => {
		beforeEach(() => {
			// OCTANE DIVERGENCE[waypoint-onenter-state-update][runtime:182f948578b98575]: no class forceUpdate; Wrapper bumps useState from onEnter.
			function Wrapper(wrapperProps) {
				const [, setTick] = useState(0, WRAPPER_TICK_SLOT);
				function doOnEnter() {
					wrapperProps.onEnter();
					setTick(function bump(previous) {
						return previous + 1;
					});
				}
				return (
					<div style={{ margin: `${window.innerHeight * 2}px 0` }}>
						<Waypoint onEnter={doOnEnter} />
					</div>
				);
			}

			subject = function renderWrapper() {
				return renderAttached(<Wrapper {...props} />);
			};
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1274
		it('only calls onEnter once', function onlyOnce(done) {
			subject();

			setTimeout(function afterTick() {
				scrollNodeTo(window, window.innerHeight);
				expect(props.onEnter.calls.count()).toBe(1);
				done();
			}, 0);

			jasmine.clock().tick(5000);
		});
	});

	describe('when the <body> itself has a margin', () => {
		beforeEach(() => {
			// document.body.style.marginTop = '0px';
			document.body.style.marginTop = '20px';
			document.body.style.position = 'relative';
			// topSpacerHeight = 20;

			// Make the spacers large enough to make the Waypoint render off-screen
			bottomSpacerHeight = window.innerHeight + 1000;

			// Make the normal parent non-scrollable
			parentStyle = {};

			subject();
		});

		afterEach(() => {
			document.body.style.marginTop = '';
			document.body.style.position = '';
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1308
		it('calls the onEnter handler', () => {
			expect(props.onEnter).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: undefined,
				event: null,
				waypointTop: 20 + topSpacerHeight,
				waypointBottom: 20 + topSpacerHeight,
				viewportTop: 0,
				viewportBottom: window.innerHeight,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1321
		it('does not call the onLeave handler', () => {
			expect(props.onLeave).not.toHaveBeenCalled();
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1325
		it('calls the onPositionChange handler', () => {
			expect(props.onPositionChange).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: undefined,
				event: null,
				waypointTop: 20 + topSpacerHeight,
				waypointBottom: 20 + topSpacerHeight,
				viewportTop: 0,
				viewportBottom: window.innerHeight,
			});
		});

		describe('when scrolling while the waypoint is visible', () => {
			beforeEach(() => {
				props.onPositionChange.calls.reset();
				scrollNodeTo(window, 10);
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1344
			it('does not call the onEnter handler again', () => {
				expect(props.onEnter.calls.count()).toBe(1);
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1348
			it('does not call the onLeave handler', () => {
				expect(props.onLeave).not.toHaveBeenCalled();
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1352
			it('does not call the onPositionChange handler', () => {
				expect(props.onPositionChange).not.toHaveBeenCalled();
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1356
			it('the onLeave handler is called when scrolling past the waypoint', () => {
				scrollNodeTo(window, 25);

				expect(props.onLeave).toHaveBeenCalledWith({
					currentPosition: Waypoint.above,
					previousPosition: Waypoint.inside,
					event: jasmine.any(Event),
					waypointTop: 20 + topSpacerHeight - 25,
					waypointBottom: 20 + topSpacerHeight - 25,
					viewportTop: 0,
					viewportBottom: window.innerHeight,
				});
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1371
			it('does not call the onEnter handler when scrolling past the waypoint', () => {
				scrollNodeTo(window, 25);

				expect(props.onEnter.calls.count()).toBe(1);
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1377
			it('the onPositionChange handler is called when scrolling past the waypoint', () => {
				scrollNodeTo(window, 25);

				expect(props.onPositionChange).toHaveBeenCalledWith({
					currentPosition: Waypoint.above,
					previousPosition: Waypoint.inside,
					event: jasmine.any(Event),
					waypointTop: 20 + topSpacerHeight - 25,
					waypointBottom: 20 + topSpacerHeight - 25,
					viewportTop: 0,
					viewportBottom: window.innerHeight,
				});
			});
		});
	});
});

// smoke tests for horizontal scrolling
function scrollNodeToHorizontal(node, scrollLeft) {
	if (node === window) {
		{
			document.documentElement.scrollLeft = scrollLeft;
			document.body.scrollLeft = scrollLeft;
			window.scrollTo(scrollLeft, 0);
		}
	} else {
		// eslint-disable-next-line no-param-reassign
		node.scrollLeft = scrollLeft;
	}
	const event = document.createEvent('Event');
	event.initEvent('scroll', false, false);
	node.dispatchEvent(event);
}

describe('<Waypoint> Horizontal', () => {
	let props;
	let margin;
	let parentWidth;
	let parentStyle;
	let leftSpacerWidth;
	let rightSpacerWidth;
	let subject;

	beforeEach(() => {
		jasmine.clock().install();
		document.body.style.margin = 'auto'; // should be no horizontal margin

		props = {
			onEnter: jasmine.createSpy('onEnter'),
			onLeave: jasmine.createSpy('onLeave'),
			horizontal: true,
		};

		margin = 10;
		parentWidth = 100;

		parentStyle = {
			height: 100,
			overflow: 'auto',
			whiteSpace: 'nowrap',
			width: parentWidth,
			margin, // Normalize the space left of the viewport.
		};

		leftSpacerWidth = 0;
		rightSpacerWidth = 0;

		subject = () => {
			const el = renderAttached(
				<div style={parentStyle}>
					<div style={{ width: leftSpacerWidth, display: 'inline-block' }} />
					<Waypoint {...props} />
					<div style={{ width: rightSpacerWidth, display: 'inline-block' }} />
				</div>,
			);

			jasmine.clock().tick(1);
			return el;
		};
	});

	afterEach(() => {
		if (div) {
			ReactDOM.unmountComponentAtNode(div);
		}
		scrollNodeToHorizontal(window, 0);
		jasmine.clock().uninstall();
	});

	describe('when a div is the scrollable ancestor', () => {
		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1464
		it('calls the onEnter handler when the Waypoint is visible on mount', () => {
			subject();

			expect(props.onEnter).toHaveBeenCalledWith({
				currentPosition: Waypoint.inside,
				previousPosition: undefined,
				event: null,
				waypointTop: margin + leftSpacerWidth,
				waypointBottom: margin + leftSpacerWidth,
				viewportTop: margin,
				viewportBottom: margin + parentWidth,
			});
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1478
		it('does not call the onEnter handler when the Waypoint is not visible on mount', () => {
			leftSpacerWidth = 300;
			subject();
			expect(props.onEnter).not.toHaveBeenCalled();
		});
	});

	describe('when the window is the scrollable ancestor', () => {
		beforeEach(() => {
			delete parentStyle.overflow;
			delete parentStyle.width;
			parentStyle.display = 'inline-block';
		});

		// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1491
		it('calls the onEnter handler when the Waypoint is visible on mount', () => {
			subject();
			expect(props.onEnter).toHaveBeenCalled();
		});

		describe('when the Waypoint is not visible on mount', () => {
			beforeEach(() => {
				leftSpacerWidth = window.innerWidth * 2;
				subject();
			});

			// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1502
			it('does not call the onEnter handler', () => {
				expect(props.onEnter).not.toHaveBeenCalled();
			});

			describe('when scrolled sideways to make the waypoint visible', () => {
				beforeEach(() => {
					scrollNodeToHorizontal(window, window.innerWidth + 100);
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1511
				it('calls the onEnter handler', () => {
					expect(props.onEnter).toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1515
				it('does not call the onLeave handler', () => {
					expect(props.onLeave).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1519
				it('does not call the onEnter handler when scrolled back to initial position', () => {
					props.onEnter.calls.reset();
					scrollNodeToHorizontal(window, 0);

					expect(props.onEnter).not.toHaveBeenCalled();
				});

				// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:1526
				it('calls the onLeave handler when scrolled back to initial position', () => {
					props.onEnter.calls.reset();
					scrollNodeToHorizontal(window, 0);

					expect(props.onLeave).toHaveBeenCalled();
				});
			});
		});
	});
});
