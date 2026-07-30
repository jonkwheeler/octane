import { useField, useForm } from '@octanejs/formisch';
import * as v from 'valibot';

const schema = v.object({
	email: v.pipe(v.string(), v.email('invalid')),
});

export function OctaneDifferentialForm() @{
	const form = useForm({
		schema,
		initialInput: { email: '' },
		validate: 'input',
	});
	const field = useField(form, { path: ['email'] });

	<div>
		<output data-value>{field.input as string}</output>
		<output data-error>{field.errors?.[0] ?? ''}</output>
		<button type="button" onClick={() => field.onChange('valid@example.com')}>
			Set valid
		</button>
	</div>
}
