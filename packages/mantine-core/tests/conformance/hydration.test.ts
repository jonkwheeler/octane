import { flushSync, hydrateRoot } from 'octane';
import { describe, expect, it, vi } from 'vitest';
import { flushEffects } from '../../../octane/tests/_helpers';
import { renderHydrationFixture } from '../../../octane/tests/_hydration-ssr';
import { ServerCore } from '../_fixtures/server-core.tsrx';

async function settle() {
  for (let index = 0; index < 3; index += 1) {
    flushEffects();
    flushSync(() => {});
    await Promise.resolve();
  }
}

describe('@octanejs/mantine-core hydration', () => {
  it('adopts compiled Stepper children and activates their content portal', async () => {
    window.matchMedia = () =>
      ({
        matches: false,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList;

    const serverResult = await renderHydrationFixture(
      'mantine-core',
      'packages/mantine-core/tests/_fixtures/server-core.tsrx',
      'ServerCore',
    );
    const container = document.createElement('div');
    container.innerHTML = serverResult.html;
    document.body.appendChild(container);
    const serverStep = container.querySelector('.mantine-Stepper-step');
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = hydrateRoot(container, ServerCore);

    try {
      await settle();
      expect(errors).not.toHaveBeenCalled();
      expect(container.querySelector('.mantine-Stepper-step')).toBe(serverStep);
      expect(container.querySelector('#server-active-step')?.textContent).toBe('Second content');
    } finally {
      root.unmount();
      errors.mockRestore();
      container.remove();
    }
  });
});
