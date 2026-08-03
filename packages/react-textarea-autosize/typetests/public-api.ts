import TextareaAutosize, {
	type TextareaAutosizeProps,
	type TextareaHeightChangeMeta,
} from '../src/index.tsrx';

const objectRef = { current: null as HTMLTextAreaElement | null };
const callbackRef = (node: HTMLTextAreaElement | null) => node;

const props = {
	cacheMeasurements: true,
	maxRows: 8,
	minRows: 2,
	ref: objectRef,
	style: { height: 40, width: '20rem' },
	onChange(event) {
		event.currentTarget.value satisfies string;
		event.target.value satisfies string;
	},
	onHeightChange(height, meta) {
		height satisfies number;
		meta satisfies TextareaHeightChangeMeta;
		meta.rowHeight satisfies number;
	},
} satisfies TextareaAutosizeProps;

const component: (props?: TextareaAutosizeProps) => unknown = TextareaAutosize;
component({ ...props, ref: callbackRef, 'aria-label': 'Message' });

// @ts-expect-error minHeight is intentionally excluded in favor of minRows.
const invalidStyle: NonNullable<TextareaAutosizeProps['style']> = { minHeight: 20 };

// @ts-expect-error React-compatible public refs do not expose Octane's multi-ref extension.
const invalidRef: TextareaAutosizeProps['ref'] = [objectRef, callbackRef];

void invalidStyle;
void invalidRef;
