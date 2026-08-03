import type { FileWithPath } from 'file-selector';
import type { Accept, AcceptGroup, FileError, ValidatorResult } from './utils/index';

export type { FileWithPath };
export type { Accept, AcceptGroup, FileError, ValidatorResult } from './utils/index';
export type DropEvent = DragEvent | ClipboardEvent | Event;
export interface FileRejection {
	file: FileWithPath;
	errors: readonly FileError[];
}
export interface DropzoneRef {
	open: () => void;
}
export interface DropzoneRootProps extends Record<string, any> {
	refKey?: string;
}
export interface DropzoneInputProps extends Record<string, any> {
	refKey?: string;
}
export interface DropzoneOptions {
	accept?: Accept | AcceptGroup[];
	disabled?: boolean;
	multiple?: boolean;
	noClick?: boolean;
	preventDropOnDocument?: boolean;
	onDragEnter?: (event: DragEvent) => void;
	onDragOver?: (event: DragEvent) => void;
	onDragLeave?: (event: DragEvent) => void;
	getFilesFromEvent?: (
		event: DropEvent | FileSystemFileHandle[],
	) => Promise<Array<File | DataTransferItem>>;
	validator?: (file: File) => ValidatorResult | Promise<ValidatorResult>;
	onDrop?: (accepted: FileWithPath[], rejected: FileRejection[], event: DropEvent) => void;
	onDropAccepted?: (accepted: FileWithPath[], event: DropEvent) => void;
	onDropRejected?: (rejected: FileRejection[], event: DropEvent) => void;
	onError?: (error: Error) => void;
	[key: string]: any;
}
export interface DropzoneState extends DropzoneRef {
	isFocused: boolean;
	isDragActive: boolean;
	isDragAccept: boolean;
	isDragReject: boolean;
	isDragUnknown: boolean;
	isDragGlobal: boolean;
	isFileDialogActive: boolean;
	isProcessing: boolean;
	acceptedFiles: readonly FileWithPath[];
	fileRejections: readonly FileRejection[];
	rootRef: { current: HTMLElement | null };
	inputRef: { current: HTMLInputElement | null };
	getRootProps: <T extends DropzoneRootProps>(props?: T) => T & DropzoneRootProps;
	getInputProps: <T extends DropzoneInputProps>(props?: T) => T & DropzoneInputProps;
}
export interface DropzoneProps extends DropzoneOptions {
	children?: (state: DropzoneState) => any;
	ref?: any;
}
