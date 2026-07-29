import { createFileRoute } from '@tanstack/react-router';
import { OctaneCompat } from 'octane/react';
import { Counter } from '../components/Counter.tsrx';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
	return <main><h1>TanStack Start React route</h1><OctaneCompat component={Counter} props={{ initialCount: 3 }} /></main>;
}
