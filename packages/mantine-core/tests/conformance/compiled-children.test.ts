import { describe, expect, it } from 'vitest';
import { CompiledChildren } from '../_fixtures/compiled-children.tsrx';
import { mount, nextPaint } from '../_helpers';

describe('@octanejs/mantine-core compiled children', () => {
  it('preserves child-aware component behavior through TSRX blocks', async () => {
    window.matchMedia = () =>
      ({
        matches: false,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList;
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof ResizeObserver;
    const result = mount(CompiledChildren, {});

    const breadcrumbs = result.find('#breadcrumbs');
    expect(breadcrumbs.querySelectorAll('a')).toHaveLength(3);
    expect(breadcrumbs.querySelectorAll('.mantine-Breadcrumbs-separator')).toHaveLength(2);

    expect(result.find('#first-section').getAttribute('data-first-section')).toBe('true');
    expect(result.find('#last-section').getAttribute('data-last-section')).toBe('true');

    const steps = result.find('#stepper').querySelectorAll('.mantine-Stepper-step');
    expect(steps).toHaveLength(2);
    expect(steps[0]?.getAttribute('data-completed')).toBe('true');
    expect(steps[1]?.getAttribute('data-progress')).toBe('true');
    await nextPaint();
    expect(result.find('#second-step-content').textContent).toBe('Second content');

    (steps[0] as HTMLElement).click();
    await nextPaint();
    expect(steps[0]?.getAttribute('data-progress')).toBe('true');
    expect(document.querySelector('#first-step-content')?.textContent).toBe('First content');

    const timeline = result.find('#timeline');
    const timelineItems = timeline.querySelectorAll('.mantine-Timeline-item');
    expect(timelineItems).toHaveLength(2);
    expect(timelineItems[0]?.hasAttribute('data-active')).toBe(true);
    expect(timelineItems[1]?.hasAttribute('data-active')).toBe(true);
    expect(timeline.hasAttribute('data-opposite')).toBe(true);

    expect(result.find('#group').querySelectorAll('button')).toHaveLength(2);
    expect(result.find('#empty-description').textContent).toBe('Try another filter');
    expect(result.find('#empty-actions').textContent).toContain('Reset');

    await nextPaint();
    const splitter = result.find('#splitter');
    expect(splitter.querySelectorAll('.mantine-Splitter-pane')).toHaveLength(2);
    expect(splitter.querySelectorAll('[role="separator"]')).toHaveLength(1);
    expect(result.find('#splitter-one').style.flexBasis).toBe('40%');
    expect(result.find('#splitter-two').style.flexBasis).toBe('60%');

    expect(result.find('#focus-content').querySelector('button')?.textContent).toBe('Focusable');

    result
      .find('#floating-target')
      .parentElement?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    await nextPaint();
    expect(result.find('#floating-target').parentElement?.style.display).toBe('inline-flex');
    expect(document.body.textContent).toContain('Floating label');

    result.click('#compiled-select');
    await nextPaint();
    expect(document.body.textContent).toContain('Alpha');
    expect(document.body.textContent).toContain('Beta');

    result.click('#menu-target');
    await nextPaint();
    await nextPaint();
    await nextPaint();
    expect(
      result.find('#menu-target').closest('[aria-haspopup="menu"]')?.getAttribute('aria-expanded'),
    ).toBe('true');
    expect(document.querySelector('#menu-item')?.textContent).toBe('Action');

    result.unmount();
  });
});
