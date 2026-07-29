import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
	head: () => ({ meta: [{ charSet: 'utf-8' }, { title: 'TanStack Start Octane island' }] }),
	component: Root,
});

function Root() {
	return <html><head><HeadContent /></head><body><Outlet /><Scripts /></body></html>;
}
