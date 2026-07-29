import { useState } from 'octane';

export type Accept = Record<string, string[]>;
export type FileWithPath = File & { path?: string };
export interface FileError { code: string; message: string }
export interface FileRejection { file: FileWithPath; errors: FileError[] }
export type DropEvent = DragEvent | Event;

interface Options {
  accept?: Accept;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  noClick?: boolean;
  noDrag?: boolean;
  noKeyboard?: boolean;
  noDragEventsBubbling?: boolean;
  autoFocus?: boolean;
  onDrop?: (accepted: FileWithPath[], rejected: FileRejection[]) => void;
  onDropAccepted?: (files: FileWithPath[]) => void;
  onDropRejected?: (files: FileRejection[]) => void;
  onDragEnter?: (event: DragEvent) => void;
  onDragLeave?: (event: DragEvent) => void;
  onDragOver?: (event: DragEvent) => void;
  onFileDialogOpen?: () => void;
  onFileDialogCancel?: () => void;
  getFilesFromEvent?: (event: DropEvent) => Promise<Array<File | DataTransferItem>>;
  validator?: (file: FileWithPath) => FileError | FileError[] | null;
  preventDropOnDocument?: boolean;
  useFsAccessApi?: boolean;
}

function accepts(file: File, accept?: Accept) {
  if (!accept || Object.keys(accept).length === 0) return true;
  return Object.entries(accept).some(([mime, extensions]) => {
    const mimeMatches = mime.endsWith('/*')
      ? file.type.startsWith(mime.slice(0, -1))
      : file.type === mime;
    const extensionMatches = extensions.some((extension) =>
      file.name.toLowerCase().endsWith(extension.toLowerCase()));
    return mimeMatches || extensionMatches;
  });
}

export function useDropzone(options: Options) {
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  const [dragState, setDragState] = useState({ active: false, accept: false, reject: false });

  const validate = (files: FileWithPath[]) => {
    const accepted: FileWithPath[] = [];
    const rejected: FileRejection[] = [];
    const tooMany = (!options.multiple && files.length > 1) ||
      (options.maxFiles !== undefined && options.maxFiles > 0 && files.length > options.maxFiles);

    for (const file of files) {
      const errors: FileError[] = [];
      if (!accepts(file, options.accept)) errors.push({ code: 'file-invalid-type', message: 'File type is not accepted' });
      if (file.size > (options.maxSize ?? Infinity)) errors.push({ code: 'file-too-large', message: 'File is larger than the maximum size' });
      if (tooMany) errors.push({ code: 'too-many-files', message: 'Too many files' });
      const custom = options.validator?.(file);
      if (custom) errors.push(...(Array.isArray(custom) ? custom : [custom]));
      errors.length ? rejected.push({ file, errors }) : accepted.push(file);
    }
    options.onDrop?.(accepted, rejected);
    accepted.length && options.onDropAccepted?.(accepted);
    rejected.length && options.onDropRejected?.(rejected);
    setDragState({ active: false, accept: false, reject: false });
  };

  const filesFrom = async (event: DropEvent) => {
    if (options.getFilesFromEvent) {
      const items = await options.getFilesFromEvent(event);
      return items.filter((item): item is FileWithPath => item instanceof File);
    }
    if ('dataTransfer' in event && event.dataTransfer) return Array.from(event.dataTransfer.files) as FileWithPath[];
    return Array.from((event.currentTarget as HTMLInputElement).files ?? []) as FileWithPath[];
  };

  const open = () => {
    if (options.disabled) return;
    options.onFileDialogOpen?.();
    input?.click();
  };

  return {
    open,
    isDragActive: dragState.active,
    isDragAccept: dragState.accept,
    isDragReject: dragState.reject,
    getInputProps: (props: Record<string, any> = {}) => ({
      ...props,
      ref: setInput,
      type: 'file',
      multiple: options.multiple,
      accept: options.accept ? Object.keys(options.accept).join(',') : undefined,
      style: { display: 'none', ...props.style },
      onChange: async (event: Event) => {
        validate(await filesFrom(event));
        props.onChange?.(event);
      },
    }),
    getRootProps: () => ({
      tabIndex: options.noKeyboard || options.disabled ? -1 : 0,
      onClick: options.noClick ? undefined : open,
      onKeyDown: options.noKeyboard ? undefined : (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      },
      onDragEnter: options.noDrag ? undefined : (event: DragEvent) => {
        event.preventDefault();
        if (options.noDragEventsBubbling) event.stopPropagation();
        const files = Array.from(event.dataTransfer?.files ?? []);
        const accepted = files.length === 0 || files.every((file) => accepts(file, options.accept));
        setDragState({ active: true, accept: accepted, reject: !accepted });
        options.onDragEnter?.(event);
      },
      onDragOver: options.noDrag ? undefined : (event: DragEvent) => {
        event.preventDefault();
        options.onDragOver?.(event);
      },
      onDragLeave: options.noDrag ? undefined : (event: DragEvent) => {
        setDragState({ active: false, accept: false, reject: false });
        options.onDragLeave?.(event);
      },
      onDrop: options.noDrag ? undefined : async (event: DragEvent) => {
        event.preventDefault();
        if (options.noDragEventsBubbling) event.stopPropagation();
        validate(await filesFrom(event));
      },
    }),
  };
}
