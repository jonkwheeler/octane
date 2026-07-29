import type { Octane } from 'octane/jsx-runtime';
import type { OctaneNode } from 'octane';
import { createContext } from 'octane';
import { useId, useUncontrolled } from '@octanejs/mantine-hooks';
import {
  DataAttributes,
  Factory,
  genericFactory,
  MantineSize,
  Primitive,
  useProps,
} from '../../../core';
import { InputsGroupFieldset } from '../../../utils/InputsGroupFieldset';
import { Input, InputWrapperProps, InputWrapperStylesNames } from '../../Input';

export interface RadioGroupContextValue<Value extends Primitive = string> {
  size: MantineSize | undefined;
  value: Value | null;
  onChange: (event: OctaneChangeEvent<HTMLInputElement> | string) => void;
  name: string;
  disabled: boolean | undefined;
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export type RadioGroupStylesNames = InputWrapperStylesNames;

export interface RadioGroupProps<Value extends Primitive = string> extends Omit<
  InputWrapperProps,
  'onChange' | 'value' | 'defaultValue'
> {
  /** `Radio` components and any other elements */
  children: OctaneNode;

  /** Controlled component value */
  value?: Value | null;

  /** Uncontrolled component default value */
  defaultValue?: Value | null;

  /** Called when value changes */
  onChange?: (value: Value) => void;

  /** Props passed down to the `Input.Wrapper` */
  wrapperProps?: MantineIntrinsicProps<'div'> & DataAttributes;

  /** Controls size of the `Input.Wrapper` @default 'sm' */
  size?: MantineSize;

  /** `name` attribute of child radio inputs. By default, `name` is generated randomly. */
  name?: string;

  /** If set, value cannot be changed */
  readOnly?: boolean;

  /** Sets `disabled` attribute, prevents interactions */
  disabled?: boolean;
}

export type RadioGroupFactory = Factory<{
  props: RadioGroupProps;
  ref: HTMLDivElement;
  stylesNames: RadioGroupStylesNames;
  signature: <Value extends Primitive = string>(props: RadioGroupProps<Value>) => OctaneNode;
}>;

export const RadioGroup = genericFactory<RadioGroupFactory>(((props: RadioGroupProps<string>) => {
  const {
    value,
    defaultValue,
    onChange,
    size,
    wrapperProps,
    children,
    name,
    readOnly,
    disabled,
    ...others
  } = useProps('RadioGroup', null, props);

  const _name = useId(name);

  const [_value, setValue] = useUncontrolled<string | null>({
    value,
    defaultValue,
    finalValue: '',
    onChange: onChange as any,
  });

  const handleChange = (event: OctaneChangeEvent<HTMLInputElement> | string) =>
    !readOnly && setValue(typeof event === 'string' ? event : event.currentTarget.value);

  return (
    <RadioGroupContext
      value={{ value: _value, onChange: handleChange, size, name: _name, disabled }}
    >
      <Input.Wrapper
        size={size}
        {...wrapperProps}
        {...others}
        labelElement="div"
        __staticSelector="RadioGroup"
      >
        <InputsGroupFieldset role="radiogroup">{children}</InputsGroupFieldset>
      </Input.Wrapper>
    </RadioGroupContext>
  );
}) as any);

RadioGroup.classes = Input.Wrapper.classes;
RadioGroup.displayName = '@mantine/core/RadioGroup';
