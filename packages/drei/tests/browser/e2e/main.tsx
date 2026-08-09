import { createRoot } from 'react-dom/client';
import App from '../../../upstream/test/e2e/App';

document.addEventListener(
	'playright:r3f',
	function () {
		(globalThis as typeof globalThis & { __dreiReady?: boolean }).__dreiReady = true;
	},
	{ once: true },
);

createRoot(document.querySelector('#root')!).render(<App />);
