import { Document, Outline, Page, Thumbnail, pdfjs } from '@octanejs/react-pdf';
import { createRoot, delegateEvents, useMemo, useState } from 'octane';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import { createProbePdf } from '../../feasibility/fixture';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const NativeWorker = window.Worker;
let workerCreations = 0;
window.Worker = class TrackedPdfWorker extends NativeWorker {
	constructor(scriptURL: string | URL, options?: WorkerOptions) {
		super(scriptURL, options);
		workerCreations += 1;
	}
};

function BrowserHarness() {
	const file = useMemo(() => ({ data: createProbePdf() }), []);
	const [documentReady, setDocumentReady] = useState(false);
	const [canvasReady, setCanvasReady] = useState(false);
	const [textReady, setTextReady] = useState(false);
	const [annotationsReady, setAnnotationsReady] = useState(false);
	const [outlineReady, setOutlineReady] = useState(false);
	const [pageLoaded, setPageLoaded] = useState(false);
	const [renderError, setRenderError] = useState('');
	const [workerCount, setWorkerCount] = useState(0);
	const [itemClick, setItemClick] = useState('');
	const [thumbnailClick, setThumbnailClick] = useState('');
	const ready = documentReady && canvasReady && textReady && annotationsReady && outlineReady;

	return <main
		id="binding-probe"
		data-status={ready ? 'ready' : 'loading'}
		data-worker-count={workerCount}
		data-document-ready={documentReady}
		data-canvas-ready={canvasReady}
		data-text-ready={textReady}
		data-annotations-ready={annotationsReady}
		data-outline-ready={outlineReady}
		data-page-loaded={pageLoaded}
		data-render-error={renderError}
		data-item-click={itemClick}
		data-thumbnail-click={thumbnailClick}
	>
		<Document
			file={file}
			onItemClick={({ pageIndex, pageNumber }) => setItemClick(`${pageIndex}:${pageNumber}`)}
			onLoadSuccess={() => {
				setDocumentReady(true);
				setWorkerCount(workerCreations);
			}}
		>
			<Page
				pageNumber={1}
				onLoadError={(error) => setRenderError(`load:${error.message}`)}
				onLoadSuccess={() => setPageLoaded(true)}
				onRenderError={(error) => setRenderError(`canvas:${error.message}`)}
				onRenderTextLayerError={(error) => setRenderError(`text:${error.message}`)}
				onRenderAnnotationLayerError={(error) => setRenderError(`annotation:${String(error)}`)}
				onRenderSuccess={() => setCanvasReady(true)}
				onRenderTextLayerSuccess={() => setTextReady(true)}
				onRenderAnnotationLayerSuccess={() => setAnnotationsReady(true)}
			/>
			<Outline onLoadSuccess={() => setOutlineReady(true)} />
			<Thumbnail
				pageNumber={1}
				onItemClick={({ pageIndex, pageNumber }) => setThumbnailClick(`${pageIndex}:${pageNumber}`)}
			/>
		</Document>
	</main>;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root');
delegateEvents(['click']);
createRoot(rootElement).render(BrowserHarness);
