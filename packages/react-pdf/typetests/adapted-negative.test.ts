import type { PageProps } from '@octanejs/react-pdf';

// @ts-expect-error pageNumber is numeric
const invalidPage: PageProps = { pageNumber: '1' };
// @ts-expect-error unsupported rendering mode
const invalidMode: PageProps = { renderMode: 'svg' };
void [invalidPage, invalidMode];
