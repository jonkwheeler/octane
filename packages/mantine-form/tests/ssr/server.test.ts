import { describe, expect, it } from 'vitest';
import { renderToString } from 'octane/server';
import { ServerFormFixture } from '../_fixtures/form.tsrx';

describe('@octanejs/mantine-form SSR', () => {
  it('renders deterministic initial form values', () => {
    expect(renderToString(ServerFormFixture).html).toContain('<div id="server-form">server</div>');
  });
});
