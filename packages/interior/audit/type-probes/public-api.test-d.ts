import type { CopyButtonProps, CopyStatus, UseCopyToClipboardOptions } from './upstream-copy-button';
import { CopyButton, useCopyToClipboard } from './upstream-copy-button';

declare function expectType<T>(value: T): void;

expectType<typeof CopyButton>(CopyButton);
expectType<typeof useCopyToClipboard>(useCopyToClipboard);

expectType<CopyStatus>('idle');
expectType<CopyStatus>('copied');
expectType<CopyStatus>('error');

type ValueProp = CopyButtonProps['value'];
expectType<string>(null as unknown as ValueProp);

type TimeoutOpt = UseCopyToClipboardOptions['timeout'];
expectType<number | undefined>(null as unknown as TimeoutOpt);

// @ts-expect-error unknown copy statuses are rejected
const badStatus: CopyStatus = 'pending';

// @ts-expect-error value is required on CopyButtonProps
const missingValue: CopyButtonProps = {};
