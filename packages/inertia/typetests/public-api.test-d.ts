import { http, progress, router } from '@octanejs/inertia';
import server from '@octanejs/inertia/server';

declare function expectType<T>(value: T): void;

expectType<typeof import('@inertiajs/core').http>(http);
expectType<typeof import('@inertiajs/core').progress>(progress);
expectType<typeof import('@inertiajs/core').router>(router);
expectType<typeof import('@inertiajs/core/server').default>(server);
