import { createFormContext, useField, useForm } from '@octanejs/mantine-form';

type Values = {
  name: string;
};

const [FormProvider, useFormContext] = createFormContext<Values>();

function ContextValue() @{
  const form = useFormContext();
  <output id="context-value">{form.values.name}</output>
}

export function FormFixture() @{
  const form = useForm<Values>({
    initialValues: { name: '' },
    validate: {
      name: (value) => (value.length < 2 ? 'Too short' : null),
    },
  });
  const field = useField({
    initialValue: 'seed',
    validate: (value) => (value === 'valid' ? null : 'Invalid field'),
  });
  const nameProps = form.getInputProps('name');
  const fieldProps = field.getInputProps();

  <FormProvider form={form}>
    <form id="form" onSubmit={form.onSubmit(() => undefined)}>
      <input id="name" {...nameProps} />
      <output id="name-value">{form.values.name}</output>
      <output id="name-error">{form.errors.name}</output>
      <button id="validate" type="button" onClick={() => form.validate()}>Validate</button>
      <ContextValue />
    </form>

    <input id="field" {...fieldProps} />
    <output id="field-value">{field.getValue()}</output>
    <button id="field-validate" type="button" onClick={() => field.validate()}>Validate field</button>
    <output id="field-error">{field.error}</output>
  </FormProvider>
}

export function ServerFormFixture() @{
  const form = useForm<Values>({ initialValues: { name: 'server' } });
  <div id="server-form">{form.values.name}</div>
}
