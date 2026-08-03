import { fromEvent } from 'file-selector';
import type { FileWithPath } from 'file-selector';
import { useCallback, useEffect, useImperativeHandle, useMemo, useReducer, useRef } from 'octane';
import { ErrorCode } from './utils/index';
import type {
	DropEvent,
	DropzoneInputProps,
	DropzoneOptions,
	DropzoneProps,
	DropzoneRootProps,
	DropzoneState,
	FileRejection,
} from './types';

export type { Accept, AcceptGroup, DropEvent, DropzoneInputProps, DropzoneOptions, DropzoneProps, DropzoneRef, DropzoneRootProps, DropzoneState, FileError, FileRejection, FileWithPath, ValidatorResult } from './types';

export { ErrorCode };

const initialState = {
	isFocused: false,
	isDragActive: false,
	isDragAccept: false,
	isDragReject: false,
	isDragUnknown: false,
	isDragGlobal: false,
	isFileDialogActive: false,
	isProcessing: false,
	acceptedFiles: [] as FileWithPath[],
	fileRejections: [] as FileRejection[],
};

export function useDropzone(options: DropzoneOptions = {}): DropzoneState {
	const rootRef = useRef<HTMLElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const mounted = useRef(true);
	const operation = useRef(0);
	const [state, patch] = useReducer(
		(value: typeof initialState, next: Partial<typeof initialState>) => ({ ...value, ...next }),
		initialState,
	);
	const getFiles = options.getFilesFromEvent ?? fromEvent;

	useEffect(
		() => () => {
			mounted.current = false;
			operation.current += 1;
		},
		[],
	);

	useEffect(() => {
		if (options.preventDropOnDocument === false || typeof document === 'undefined') return;
		const prevent = (event: DragEvent) => event.preventDefault();
		document.addEventListener('dragover', prevent);
		document.addEventListener('drop', prevent);
		return () => {
			document.removeEventListener('dragover', prevent);
			document.removeEventListener('drop', prevent);
		};
	}, [options.preventDropOnDocument]);

	const process = useCallback(async (event: DropEvent) => {
		const id = ++operation.current;
		patch({ isProcessing: true });
		try {
			const selected = await getFiles(event);
			const accepted: FileWithPath[] = [];
			const rejected: FileRejection[] = [];
			for (const candidate of selected) {
				if (!(candidate instanceof File)) continue;
				const result = await options.validator?.(candidate);
				const errors =
					result == null
						? []
						: Array.isArray(result)
							? result
							: [result];
				const file = candidate as FileWithPath;
				if (errors.length) rejected.push({ file, errors });
				else accepted.push(file);
			}
			if (!mounted.current || id !== operation.current) return;
			patch({
				acceptedFiles: accepted,
				fileRejections: rejected,
				isProcessing: false,
				isDragActive: false,
			});
			options.onDrop?.(accepted, rejected, event);
			if (accepted.length) options.onDropAccepted?.(accepted, event);
			if (rejected.length) options.onDropRejected?.(rejected, event);
		} catch (error) {
			if (!mounted.current || id !== operation.current) return;
			patch({ isProcessing: false });
			options.onError?.(error instanceof Error ? error : new Error(String(error)));
		}
	}, [getFiles, options.validator, options.onDrop, options.onDropAccepted, options.onDropRejected, options.onError]);

	const open = useCallback(() => inputRef.current?.click(), []);
	const getRootProps = useCallback(<T extends DropzoneRootProps,>(user = {} as T) => {
		const refKey = user.refKey ?? 'ref';
		const userRef = user[refKey];
		const onClick = user.onClick;
		const onDrop = user.onDrop;
		const result: any = {
			...user,
			role: user.role ?? 'presentation',
			tabIndex: options.disabled ? undefined : user.tabIndex ?? 0,
			onClick: (event: MouseEvent) => {
				onClick?.(event);
				if (
					!options.disabled && !options.noClick && !event.defaultPrevented &&
						event.target !== inputRef.current
				) open();
			},
			onDragEnter: (event: DragEvent) => {
				event.preventDefault();
				patch({ isDragActive: true, isDragGlobal: true });
				user.onDragEnter?.(event);
			},
			onDragLeave: (event: DragEvent) => {
				patch({ isDragActive: false });
				user.onDragLeave?.(event);
			},
			onDragOver: (event: DragEvent) => {
				event.preventDefault();
				user.onDragOver?.(event);
			},
			onDrop: (event: DragEvent) => {
				event.preventDefault();
				onDrop?.(event);
				if (!event.defaultPrevented || event.dataTransfer) void process(event);
			},
		};
		delete result.refKey;
		result[refKey] = [rootRef, userRef].filter(Boolean);
		return result;
	}, [options.disabled, options.noClick, open, process]);
	const getInputProps = useCallback(<T extends DropzoneInputProps,>(user = {} as T) => {
		const refKey = user.refKey ?? 'ref';
		const userRef = user[refKey];
		const onChange = user.onChange;
		const result: any = {
			...user,
			type: 'file',
			multiple: options.multiple ?? true,
			style: {
				clip: 'rect(0, 0, 0, 0)',
				height: 1,
				margin: -1,
				overflow: 'hidden',
				padding: 0,
				position: 'absolute',
				whiteSpace: 'nowrap',
				width: 1,
				border: 0,
				...user.style,
			},
			tabIndex: -1,
			onChange: (event: Event) => {
				onChange?.(event);
				void process(event);
			},
		};
		delete result.refKey;
		result[refKey] = [inputRef, userRef].filter(Boolean);
		return result;
	}, [options.multiple, process]);

	return useMemo(() => ({ ...state, rootRef, inputRef, getRootProps, getInputProps, open }), [
		state,
		getRootProps,
		getInputProps,
		open,
	]);
}

export default function Dropzone({ children, ref, ...options }: DropzoneProps) @{
	const state = useDropzone(options);
	useImperativeHandle(ref, () => ({ open: state.open }), [state.open]);
	<>
		{children?.(state)}
	</>
}
