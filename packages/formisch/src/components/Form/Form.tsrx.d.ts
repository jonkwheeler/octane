import type { FormSchema, SubmitEventHandler } from '../../core/index.ts';
import type { FormStore } from '../../types/index.ts';
import type { OctaneNode } from 'octane';

export type FormProps<TSchema extends FormSchema = FormSchema> = Record<string, unknown> & {
	readonly of: FormStore<TSchema>;
	readonly onSubmit: SubmitEventHandler<TSchema>;
	readonly children?: OctaneNode;
};

export declare function Form<TSchema extends FormSchema>(props: FormProps<TSchema>): OctaneNode;
