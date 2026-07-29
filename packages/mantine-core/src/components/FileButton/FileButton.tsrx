import type { Octane } from 'octane/jsx-runtime';
import type { OctaneNode } from 'octane';
import type React from 'react';
import { useRef } from 'octane';
import { assignRef, useMergedRef } from '@octanejs/mantine-hooks';
import { Factory, genericFactory, useProps } from '../../core';

export interface FileButtonProps<Multiple extends boolean = false> {
  ref?: OctaneRef<HTMLInputElement>;

  /** Called when files are picked */
  onChange: (payload: Multiple extends true ? File[] : File | null) => void;

  /** Function that receives button props and returns react node that should be rendered */
  children: (props: { onClick: () => void }) => OctaneNode;

  /** If set, user can pick more than one file */
  multiple?: Multiple;

  /** File input accept attribute, for example, `"image/png,image/jpeg"` */
  accept?: string;

  /** Input name attribute */
  name?: string;

  /** Input form attribute */
  form?: string;

  /** Reference of the function that should be called when value changes to null or empty array */
  resetRef?: OctaneRef<() => void>;

  /** Disables file picker */
  disabled?: boolean;

  /** Specifies that, optionally, a new file should be captured, and which device should be used to capture that new media of a type defined by the accept attribute. */
  capture?: boolean | 'user' | 'environment';

  /** Passes down props to the input element used to capture files */
  inputProps?: MantineIntrinsicProps<'input'>;
}

export type FileButtonFactory = Factory<{
  props: FileButtonProps;
  signature: <Multiple extends boolean = false>(
    props: FileButtonProps<Multiple>
  ) => OctaneNode;
}>;

export const FileButton = genericFactory<FileButtonFactory>((props) => {
  const {
    onChange,
    children,
    multiple,
    accept,
    name,
    form,
    resetRef,
    disabled,
    capture,
    inputProps,
    ref,
    ...others
  } = useProps('FileButton', null, props);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const onClick = () => {
    !disabled && inputRef.current?.click();
  };

  const handleChange = (event: OctaneChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files === null) {
      return onChange(multiple ? ([] as any) : null);
    }

    if (multiple) {
      onChange(Array.from(event.currentTarget.files) as any);
    } else {
      onChange((event.currentTarget.files[0] as any) || null);
    }
  };

  const reset = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  assignRef(resetRef, reset);

  return (
    <>
      <input
        style={{ display: 'none' }}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        ref={useMergedRef(ref, inputRef)}
        name={name}
        form={form}
        capture={capture}
        {...inputProps}
      />

      {children({ onClick, ...others })}
    </>
  );
});

FileButton.displayName = '@mantine/core/FileButton';

export declare namespace FileButton {
  export type Props<Multiple extends boolean = false> = FileButtonProps<Multiple>;
  export type Factory = FileButtonFactory;
}
