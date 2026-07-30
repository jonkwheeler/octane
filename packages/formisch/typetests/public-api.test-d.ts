import type {
	FieldElement,
	FormConfig,
	FormSchema,
	SubmitEventHandler,
	SubmitHandler,
	ValidPath,
} from '@octanejs/formisch';
import type { GenericSchema } from 'valibot';

declare const schema: GenericSchema;
declare const config: FormConfig<FormSchema>;
declare const field: FieldElement;
declare const path: ValidPath<{ name: string }, ['name']>;
declare const submit: SubmitHandler<FormSchema>;
declare const eventSubmit: SubmitEventHandler<FormSchema>;

void schema;
void config;
void field;
void path;
void submit;
void eventSubmit;
