import { useTimePickerContext } from '../TimePicker.context.tsrx';

interface AmPmInputProps
  extends Omit<MantineIntrinsicProps<'select'>, 'value' | 'onChange' | 'onInput'> {
  labels: { am: string; pm: string };
  value: string | null;
  inputType: 'select' | 'input';
  onChange: (value: string | null) => void;
  readOnly?: boolean;
  onPreviousInput?: () => void;
}

export function AmPmInput({
  labels,
  value,
  onChange,
  className,
  style,
  onPreviousInput,
  readOnly,
  onMouseDown,
  onTouchStart,
  inputType,
  ...others
}: AmPmInputProps) {
  const ctx = useTimePickerContext();

  const handleKeyDown = (event: OctaneKeyboardEvent<HTMLSelectElement>) => {
    if (readOnly) {
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      onChange(labels.am);
    }

    if (event.key === 'End') {
      event.preventDefault();
      onChange(labels.pm);
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      if (value === null) {
        onPreviousInput?.();
      } else {
        onChange(null);
      }
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onPreviousInput?.();
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(value === labels.am ? labels.pm : labels.am);
    }

    if (event.code === 'KeyA') {
      event.preventDefault();
      onChange(labels.am);
    }

    if (event.code === 'KeyP') {
      event.preventDefault();
      onChange(labels.pm);
    }
  };

  if (inputType === 'input') {
    const displayValue = value || '--';
    const inputSize = displayValue.length + 1;

    return (
      <input
        {...ctx.getStyles('field', { className, style })}
        value={displayValue}
        size={inputSize}
        onInput={(event) => !readOnly && onChange(event.currentTarget.value || null)}
        onClick={((event: any) => event.stopPropagation()) as any}
        onKeyDown={handleKeyDown as any}
        onMouseDown={(event) => {
          event.stopPropagation();
          onMouseDown?.(event as any);
        }}
        data-am-pm
        {...(others as any)}
      />
    );
  }

  return (
    <select
      {...ctx.getStyles('field', { className, style })}
      value={value || ''}
      onInput={(event) => !readOnly && onChange(event.currentTarget.value || null)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        event.stopPropagation();
        onMouseDown?.(event);
      }}
      data-am-pm
      {...others}
    >
      <option value="">--</option>
      <option value={labels.am}>{labels.am}</option>
      <option value={labels.pm}>{labels.pm}</option>
    </select>
  );
}

AmPmInput.displayName = '@mantine/dates/AmPmInput';
