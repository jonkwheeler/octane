export type CopyStatus = 'idle' | 'copied' | 'error';

export type UseCopyToClipboardOptions = {
	timeout?: number;
	onCopy?: (value: string) => void;
	onError?: (reason: unknown) => void;
};

export type CopyButtonProps = {
	value: string;
	label?: string;
	copiedLabel?: string;
	errorLabel?: string;
	timeout?: number;
	onCopy?: (value: string) => void;
	onError?: (reason: unknown) => void;
	disabled?: boolean;
	className?: string;
};

export declare function useCopyToClipboard(options?: UseCopyToClipboardOptions): {
	copy: (value: string) => Promise<boolean>;
	status: CopyStatus;
	reset: () => void;
};

export declare function CopyButton(props: CopyButtonProps): JSX.Element;
