import { type FormSchema, INTERNAL, type SubmitEventHandler } from '../../core/index.ts';
import { handleSubmit } from '../../methods/index.ts';
import type { FormStore } from '../../types/index.ts';
import type { OctaneNode } from 'octane';

export type FormProps<TSchema extends FormSchema = FormSchema> =
	Record<string, unknown> & {
		readonly of: FormStore<TSchema>;
		readonly onSubmit: SubmitEventHandler<TSchema>;
		readonly children?: OctaneNode;
	};

export function Form<TSchema extends FormSchema>({ of, onSubmit, children, ...other }: FormProps<
	TSchema
>) @{
	<form
		{...other}
		noValidate
		ref={(element) => {
			if (element) of[INTERNAL].element = element;
		}}
		onSubmit={handleSubmit(of, onSubmit)}
	>{children}</form>
}
