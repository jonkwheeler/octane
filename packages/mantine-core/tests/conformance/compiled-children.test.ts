import { describe, expect, it } from 'vitest';
import { CompiledChildren } from '../_fixtures/compiled-children.tsrx';
import { mount } from '../_helpers';

describe('@octanejs/mantine-core compiled children', () => {
  it('preserves child-aware component behavior through TSRX blocks', () => {
    window.matchMedia = () =>
      ({
        matches: false,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList;
    const result = mount(CompiledChildren, {});

    const breadcrumbs = result.find('#breadcrumbs');
    expect(breadcrumbs.querySelectorAll('a')).toHaveLength(3);
    expect(breadcrumbs.querySelectorAll('.mantine-Breadcrumbs-separator')).toHaveLength(2);

    expect(result.find('#first-section').getAttribute('data-first-section')).toBe('true');
    expect(result.find('#last-section').getAttribute('data-last-section')).toBe('true');

    result.unmount();
  });
});
