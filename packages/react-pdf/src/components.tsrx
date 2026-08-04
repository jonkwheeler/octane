import { createElement, isChildrenBlock, useEffect, useMemo, useRef, useState } from 'octane';
import type {
	PDFDocumentLoadingTask,
	PDFDocumentProxy,
	PDFPageProxy,
	PageViewport,
} from 'pdfjs-dist';

import { DocumentContext, OutlineContext, PageContext, useDocumentContext } from './contexts.js';
import LinkService from './LinkService.js';
import PasswordResponses from './PasswordResponses.js';
import { setRef } from './refs.js';
import type {
	Annotations,
	DocumentContextValue,
	DocumentProps,
	DocumentRenderProps,
	NodeOrRenderer,
	OutlineProps,
	PageCallback,
	PageProps,
	PageRenderProps,
	Source,
	TextItem,
	ThumbnailProps,
} from './types.js';

function renderMessage(value: NodeOrRenderer): unknown {
	return typeof value === 'function' ? value() : value;
}

function dataUriToBytes(uri: string): Uint8Array {
	const comma = uri.indexOf(',');
	if (comma < 0) throw new Error('Invalid data URI.');
	const metadata = uri.slice(0, comma);
	const payload = uri.slice(comma + 1);
	const decoded =
		metadata.endsWith(';base64') ? atob(payload) : decodeURIComponent(payload);
	return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function resolveSource(file: DocumentProps['file']): Promise<Source | null> {
	if (!file) return null;
	if (typeof file === 'string') {
		return file.startsWith('data:application/pdf') ? { data: dataUriToBytes(file) } : { url: file };
	}
	if (file instanceof ArrayBuffer) return { data: file };
	if (typeof Blob !== 'undefined' && file instanceof Blob) {
		return { data: await file.arrayBuffer() };
	}
	if (typeof file === 'object' && ('data' in file || 'range' in file || 'url' in file)) {
		return file;
	}
	throw new Error('Invalid PDF source.');
}

function defaultOnPassword(callback: (password: string | null) => void, reason: number): void {
	if (typeof prompt !== 'function') return callback(null);
	callback(
		prompt(
			reason === PasswordResponses.INCORRECT_PASSWORD
				? 'Invalid password. Please try again.'
				: 'Enter the password to open this PDF file.',
		),
	);
}

export function Document(props: DocumentProps = {}) {
	const {
		children,
		class: classProp,
		className,
		error = 'Failed to load PDF file.',
		externalLinkRel,
		externalLinkTarget,
		file,
		imageResourcesPath,
		inputRef,
		loading = 'Loading PDF…',
		noData = 'No PDF file specified.',
		onItemClick,
		onLoadError,
		onLoadProgress,
		onLoadSuccess,
		onPassword = defaultOnPassword,
		onSourceError,
		onSourceSuccess,
		options,
		ref,
		renderMode,
		rotate,
		scale,
		...hostProps
	} = props;
	const documentElement = useRef<HTMLDivElement | null>(null);
	const linkServiceRef = useRef<LinkService | null>(null);
	const pagesRef = useRef<HTMLDivElement[]>([]);
	const [source, setSource] = useState<Source | false | null | undefined>(undefined);
	const [sourceError, setSourceError] = useState<Error | null>(null);
	const [pdf, setPdf] = useState<PDFDocumentProxy | false | undefined>(undefined);
	const [pdfError, setPdfError] = useState<Error | null>(null);

	if (!linkServiceRef.current) linkServiceRef.current = new LinkService();
	const linkService = linkServiceRef.current;

	useEffect(() => {
		setRef(inputRef, documentElement.current);
		return () => setRef(inputRef, null);
	}, [inputRef]);

	useEffect(() => {
		const imperative = {
			linkService: linkServiceRef,
			pages: pagesRef,
			viewer: {
				current: {
					scrollPageIntoView({ pageIndex = 0 }: { pageIndex?: number }) {
						pagesRef.current[pageIndex]?.scrollIntoView();
					},
				},
			},
		};
		setRef(ref as never, imperative);
		return () => setRef(ref as never, null);
	}, [ref]);

	useEffect(() => {
		let active = true;
		setSource(undefined);
		setSourceError(null);
		void resolveSource(file).then((nextSource) => {
			if (!active) return;
			setSource(nextSource);
			onSourceSuccess?.();
		}).catch((caught: unknown) => {
			if (!active) return;
			const nextError =
				caught instanceof Error ? caught : new Error(String(caught));
			setSource(false);
			setSourceError(nextError);
			onSourceError?.(nextError);
		});
		return () => {
			active = false;
		};
	}, [file]);

	useEffect(() => {
		let loadingTask: PDFDocumentLoadingTask | undefined;
		let active = true;
		setPdf(undefined);
		setPdfError(null);
		if (!source) return;

		void import('pdfjs-dist').then((pdfjs) => {
			if (!active) return;
			loadingTask = pdfjs.getDocument({ ...source, ...options } as never);
			if (onLoadProgress) loadingTask.onProgress = onLoadProgress;
			loadingTask.onPassword = onPassword;
			return loadingTask.promise;
		}).then((nextPdf) => {
			if (!active || !nextPdf) return;
			setPdf(nextPdf);
			pagesRef.current = new Array(nextPdf.numPages);
			linkService.setDocument(nextPdf);
			onLoadSuccess?.(nextPdf);
		}).catch((caught: unknown) => {
			if (!active) return;
			const nextError =
				caught instanceof Error ? caught : new Error(String(caught));
			setPdf(false);
			setPdfError(nextError);
			onLoadError?.(nextError);
		});

		return () => {
			active = false;
			void loadingTask?.destroy();
		};
	}, [source, options]);

	useEffect(() => {
		linkService.setExternalLinkRel(externalLinkRel);
		linkService.setExternalLinkTarget(externalLinkTarget);
		linkService.setViewer({
			scrollPageIntoView({ pageIndex = 0 }) {
				if (onItemClick) {
					onItemClick({ pageIndex, pageNumber: pageIndex + 1 });
					return;
				}
				pagesRef.current[pageIndex]?.scrollIntoView();
			},
		});
	}, [externalLinkRel, externalLinkTarget, onItemClick]);

	const contextValue = useMemo<DocumentContextValue>(
		() => ({
			imageResourcesPath,
			linkService,
			onItemClick,
			pdf,
			registerPage(index, element) {
				pagesRef.current[index] = element;
			},
			renderMode,
			rotate,
			scale,
			unregisterPage(index) {
				delete pagesRef.current[index];
			},
		}),
		[imageResourcesPath, linkService, onItemClick, pdf, renderMode, rotate, scale],
	);

	let content: unknown;
	if (!file) {
		content = <div class="react-pdf__message react-pdf__message--no-data">{renderMessage(
			noData,
		)}</div>;
	} else if (sourceError || pdfError || source === false || pdf === false) {
		content = <div class="react-pdf__message react-pdf__message--error">{renderMessage(
			error,
		)}</div>;
	} else if (!pdf) {
		content = <div class="react-pdf__message react-pdf__message--loading">{renderMessage(
			loading,
		)}</div>;
	} else {
		content = typeof children === 'function' && !isChildrenBlock(children)
			? children(contextValue as DocumentRenderProps)
			: children;
	}

	return <div
		{...hostProps}
		ref={documentElement}
		class={['react-pdf__Document', classProp, className]}
	>
		<DocumentContext.Provider value={contextValue}>{content}</DocumentContext.Provider>
	</div>;
}

function makePageCallback(page: PDFPageProxy, viewport: PageViewport): PageCallback {
	const original = page.getViewport({ scale: 1, rotation: viewport.rotation });
	return Object.assign(page, {
		width: viewport.width,
		height: viewport.height,
		originalWidth: original.width,
		originalHeight: original.height,
	});
}

export function Page(props: PageProps = {}) {
	const documentContext = useDocumentContext();
	const merged = { ...documentContext, ...props } as PageProps;
	const {
		_className = 'react-pdf__Page',
		_enableRegisterUnregisterPage = true,
		canvasBackground,
		canvasRef,
		children,
		class: classProp,
		className,
		customRenderer,
		customTextRenderer,
		devicePixelRatio,
		error = 'Failed to load the page.',
		filterAnnotations,
		height,
		inputRef,
		loading = 'Loading page…',
		noData = 'No page specified.',
		onGetAnnotationsError,
		onGetAnnotationsSuccess,
		onGetStructTreeError,
		onGetStructTreeSuccess,
		onGetTextError,
		onGetTextSuccess,
		onLoadError,
		onLoadSuccess,
		onRenderAnnotationLayerError,
		onRenderAnnotationLayerSuccess,
		onRenderError,
		onRenderSuccess,
		onRenderTextLayerError,
		onRenderTextLayerSuccess,
		pageColors,
		pageIndex: pageIndexProp,
		pageNumber: pageNumberProp,
		pdf,
		registerPage,
		renderAnnotationLayer = true,
		renderForms = false,
		renderMode = 'canvas',
		renderTextLayer = true,
		rotate: rotateProp,
		scale: scaleProp = 1,
		style,
		unregisterPage,
		width,
		...hostProps
	} = merged;
	const pageElement = useRef<HTMLDivElement | null>(null);
	const canvasElement = useRef<HTMLCanvasElement | null>(null);
	const textElement = useRef<HTMLDivElement | null>(null);
	const annotationElement = useRef<HTMLDivElement | null>(null);
	const [page, setPage] = useState<PDFPageProxy | false | undefined>(undefined);
	const [pageError, setPageError] = useState<Error | null>(null);
	const pageIndex =
		pageNumberProp != null ? pageNumberProp - 1 : pageIndexProp;
	const pageNumber = pageNumberProp ?? (pageIndexProp != null ? pageIndexProp + 1 : undefined);

	if (pdf === undefined && documentContext === null) {
		throw new Error('Attempted to load a page, but no document was specified.');
	}

	const viewport = useMemo(() => {
		if (!page || !pageNumber) return null;
		const rotation = rotateProp ?? page.rotate;
		const base = page.getViewport({ scale: 1, rotation });
		const sizeScale =
			width
				? width / base.width
				: height
					? height / base.height
					: 1;
		return page.getViewport({ scale: scaleProp * sizeScale, rotation });
	}, [height, page, pageNumber, rotateProp, scaleProp, width]);

	useEffect(() => {
		let active = true;
		setPage(undefined);
		setPageError(null);
		if (!pdf || !pageNumber) return;
		void pdf.getPage(pageNumber).then((nextPage) => {
			if (!active) return;
			setPage(nextPage);
		}).catch((caught: unknown) => {
			if (!active) return;
			const nextError =
				caught instanceof Error ? caught : new Error(String(caught));
			setPage(false);
			setPageError(nextError);
			onLoadError?.(nextError);
		});
		return () => {
			active = false;
		};
	}, [pdf, pageNumber]);

	useEffect(() => {
		if (!page || !viewport || pageIndex == null) return;
		const callback = makePageCallback(page, viewport);
		onLoadSuccess?.(callback);
		if (_enableRegisterUnregisterPage && pageElement.current) {
			registerPage?.(pageIndex, pageElement.current);
		}
		return () => {
			if (_enableRegisterUnregisterPage) unregisterPage?.(pageIndex);
		};
	}, [page, viewport, pageIndex]);

	useEffect(() => {
		setRef(inputRef, pageElement.current);
		return () => setRef(inputRef, null);
	}, [inputRef]);

	useEffect(() => {
		setRef(canvasRef, canvasElement.current);
		return () => setRef(canvasRef, null);
	}, [canvasRef, page, renderMode]);

	useEffect(() => {
		if (!page || !viewport || pageIndex == null || pageNumber == null || !pdf) return;
		let active = true;
		let renderTask: { cancel: () => void; promise: Promise<unknown> } | undefined;
		let textLayer: { cancel: () => void; render: () => Promise<void> } | undefined;
		void (async () => {
			try {
				const pdfjs = await import('pdfjs-dist');
				if (renderMode === 'canvas' && canvasElement.current) {
					const ratio = devicePixelRatio ?? window.devicePixelRatio ?? 1;
					const canvas = canvasElement.current;
					canvas.width = Math.floor(viewport.width * ratio);
					canvas.height = Math.floor(viewport.height * ratio);
					canvas.style.width = `${Math.floor(viewport.width)}px`;
					canvas.style.height = `${Math.floor(viewport.height)}px`;
					renderTask = page.render({
						canvas,
						canvasContext: canvas.getContext('2d', { alpha: canvasBackground === 'transparent' })!,
						background: canvasBackground,
						transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
						viewport,
					});
					await renderTask.promise;
					if (active) onRenderSuccess?.(makePageCallback(page, viewport));
				}

				if (renderTextLayer && textElement.current) {
					const content = await page.getTextContent();
					onGetTextSuccess?.(content);
					textLayer = new pdfjs.TextLayer({
						container: textElement.current,
						textContentSource: content,
						viewport,
					}) as { cancel: () => void; render: () => Promise<void> };
					await textLayer.render();
					if (customTextRenderer) {
						const spans = textElement.current.querySelectorAll('span');
						const items = content.items.filter((item): item is TextItem => 'str' in item);
						spans.forEach((span, index) => {
							const item = items[index];
							if (item) span.innerHTML = customTextRenderer({
								...item,
								itemIndex: index,
								pageIndex,
								pageNumber,
							});
						});
					}
					if (active) onRenderTextLayerSuccess?.();
				}

				if (renderAnnotationLayer && annotationElement.current) {
					let annotations = await page.getAnnotations() as Annotations;
					onGetAnnotationsSuccess?.(annotations);
					if (filterAnnotations) annotations = filterAnnotations({ annotations });
					const annotationViewport = viewport.clone({ dontFlip: true });
					const parameters = {
						accessibilityManager: null,
						annotationCanvasMap: null,
						annotationEditorUIManager: null,
						annotationStorage: pdf.annotationStorage,
						commentManager: null,
						div: annotationElement.current,
						linkService: documentContext?.linkService,
						page,
						structTreeLayer: null,
						viewport: annotationViewport,
					};
					await new pdfjs.AnnotationLayer(parameters as never).render(
						{
							annotations,
							annotationStorage: pdf.annotationStorage,
							div: annotationElement.current,
							linkService: documentContext?.linkService,
							page,
							renderForms,
							viewport: annotationViewport,
						} as never,
					);
					if (active) onRenderAnnotationLayerSuccess?.();
				}

				try {
					const tree = await page.getStructTree();
					if (tree && active) onGetStructTreeSuccess?.(tree);
				} catch (caught) {
					if (active) onGetStructTreeError?.(
						caught instanceof Error ? caught : new Error(String(caught)),
					);
				}
			} catch (caught) {
				if (!active) return;
				const nextError =
					caught instanceof Error ? caught : new Error(String(caught));
				if (renderTask) onRenderError?.(nextError);
				else if (renderTextLayer) onRenderTextLayerError?.(nextError);
				else if (renderAnnotationLayer) onRenderAnnotationLayerError?.(nextError);
				onGetTextError?.(nextError);
				onGetAnnotationsError?.(nextError);
			}
		})();
		return () => {
			active = false;
			renderTask?.cancel();
			textLayer?.cancel();
			if (textElement.current) textElement.current.replaceChildren();
			if (annotationElement.current) annotationElement.current.replaceChildren();
		};
	}, [page, viewport, renderMode, renderTextLayer, renderAnnotationLayer, renderForms]);

	const contextValue =
		page && viewport && pageIndex != null && pageNumber != null
			? {
					page,
					pageIndex,
					pageNumber,
					rotate: viewport.rotation,
					scale: viewport.scale,
				}
			: null;

	let content: unknown;
	if (!pageNumber) {
		content = <div class="react-pdf__message react-pdf__message--no-data">{renderMessage(
			noData,
		)}</div>;
	} else if (pdf === false || page === false || pageError) {
		content = <div class="react-pdf__message react-pdf__message--error">{renderMessage(
			error,
		)}</div>;
	} else if (!page || !viewport || !contextValue) {
		content = <div class="react-pdf__message react-pdf__message--loading">{renderMessage(
			loading,
		)}</div>;
	} else {
		const renderProps = contextValue as PageRenderProps;
		content = <PageContext.Provider value={contextValue}>
			{renderMode === 'canvas'
				? <canvas ref={canvasElement} class="react-pdf__Page__canvas" />
				: null}
			{renderMode === 'custom' && customRenderer ? createElement(customRenderer, {}) : null}
			{renderTextLayer
				? <div ref={textElement} class="react-pdf__Page__textContent textLayer" />
				: null}
			{renderAnnotationLayer
				? <div ref={annotationElement} class="react-pdf__Page__annotations annotationLayer" />
				: null}
			{typeof children === 'function' && !isChildrenBlock(children)
				? children(renderProps)
				: children}
		</PageContext.Provider>;
	}

	return <div
		{...hostProps}
		ref={pageElement}
		class={[_className, classProp, className]}
		data-page-number={pageNumber}
		style={[
			{
				'--scale-factor': viewport?.scale ?? scaleProp,
				'--user-unit': '1',
				backgroundColor: canvasBackground || 'white',
				minHeight: 'min-content',
				minWidth: 'min-content',
				position: 'relative',
			},
			style,
		] as never}
	>{content}</div>;
}

export function Thumbnail(props: ThumbnailProps = {}) {
	const documentContext = useDocumentContext();
	const { onItemClick, pageIndex, pageNumber, ...pageProps } = props;
	const resolvedPageNumber = pageNumber ?? (pageIndex != null ? pageIndex + 1 : undefined);
	const resolvedPageIndex =
		resolvedPageNumber != null ? resolvedPageNumber - 1 : 0;

	function handleClick() {
		if (resolvedPageNumber == null) return;
		const args = { pageIndex: resolvedPageIndex, pageNumber: resolvedPageNumber };
		if (onItemClick) onItemClick(args);
		else if (documentContext?.onItemClick) documentContext.onItemClick(args);
		else documentContext?.linkService.goToPage(resolvedPageNumber);
	}

	return <div class="react-pdf__Thumbnail" onClick={handleClick}>
		<Page
			{...pageProps}
			_className="react-pdf__Thumbnail__page"
			_enableRegisterUnregisterPage={false}
			pageIndex={pageIndex}
			pageNumber={pageNumber}
			renderAnnotationLayer={false}
			renderTextLayer={false}
		/>
	</div>;
}

type OutlineEntry = NonNullable<Awaited<ReturnType<PDFDocumentProxy['getOutline']>>>[number];

function OutlineItem({
	item,
	pdf,
	onItemClick,
}: {
	item: OutlineEntry;
	pdf: PDFDocumentProxy;
	onItemClick?: OutlineProps['onItemClick'];
}) {
	async function activate(event: Event) {
		event.preventDefault();
		const dest =
			typeof item.dest === 'string' ? await pdf.getDestination(item.dest) : item.dest;
		if (!dest) return;
		const reference = dest[0];
		const pageIndex =
			typeof reference === 'number' ? reference : await pdf.getPageIndex(reference);
		const args = { dest, pageIndex, pageNumber: pageIndex + 1 };
		if (onItemClick) onItemClick(args);
	}

	return <li>
		<a href="#" onClick={activate}>{item.title}</a>
		{item.items.length
			? <ul>{item.items.map(
					(child) => <OutlineItem item={child} pdf={pdf} onItemClick={onItemClick} />,
				)}</ul>
			: null}
	</li>;
}

export function Outline(props: OutlineProps = {}) {
	const documentContext = useDocumentContext();
	const {
		class: classProp,
		className,
		inputRef,
		onItemClick,
		onLoadError,
		onLoadSuccess,
		pdf = documentContext?.pdf,
		...hostProps
	} = props;
	const outlineElement = useRef<HTMLDivElement | null>(null);
	const [outline, setOutline] = useState<
		Awaited<ReturnType<PDFDocumentProxy['getOutline']>> | undefined
	>();
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		setRef(inputRef, outlineElement.current);
		return () => setRef(inputRef, null);
	}, [inputRef]);

	useEffect(() => {
		let active = true;
		setOutline(undefined);
		setFailed(false);
		if (!pdf) return;
		void pdf.getOutline().then((nextOutline) => {
			if (!active) return;
			setOutline(nextOutline);
			onLoadSuccess?.(nextOutline);
		}).catch((caught: unknown) => {
			if (!active) return;
			const error =
				caught instanceof Error ? caught : new Error(String(caught));
			setFailed(true);
			onLoadError?.(error);
		});
		return () => {
			active = false;
		};
	}, [pdf]);

	if (!pdf || failed || !outline) return null;
	const clickHandler = onItemClick ?? documentContext?.onItemClick;
	return <div
		{...hostProps}
		ref={outlineElement}
		class={['react-pdf__Outline', classProp, className]}
	>
		<OutlineContext.Provider value={{ onItemClick: clickHandler }}>
			<ul>{outline.map(
				(item) => <OutlineItem item={item} pdf={pdf} onItemClick={clickHandler} />,
			)}</ul>
		</OutlineContext.Provider>
	</div>;
}
