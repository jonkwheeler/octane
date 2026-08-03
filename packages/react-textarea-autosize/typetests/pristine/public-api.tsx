import TextareaAutosize, {
	type TextareaAutosizeProps,
	type TextareaHeightChangeMeta,
} from '../../upstream/dist/declarations/src/index.js';

const objectRef = { current: null as HTMLTextAreaElement | null };

const props = {
	cacheMeasurements: true,
	maxRows: 8,
	minRows: 2,
	ref: objectRef,
	style: { height: 40, width: '20rem' },
	onChange(event) {
		event.currentTarget.value satisfies string;
		event.nativeEvent satisfies Event;
		event.persist();
	},
	onHeightChange(height, meta) {
		height satisfies number;
		meta satisfies TextareaHeightChangeMeta;
		meta.rowHeight satisfies number;
	},
} satisfies TextareaAutosizeProps & React.RefAttributes<HTMLTextAreaElement>;

<TextareaAutosize {...props} aria-label="Message" />;

const invalidStyle = {
	// @ts-expect-error minHeight is intentionally excluded in favor of minRows.
	minHeight: 20,
} satisfies NonNullable<TextareaAutosizeProps['style']>;

// @ts-expect-error React's public ref contract does not accept a ref array.
const invalidRef: React.Ref<HTMLTextAreaElement> = [objectRef];

void invalidStyle;
void invalidRef;
