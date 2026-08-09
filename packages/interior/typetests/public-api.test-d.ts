import type { OctaneNode } from 'octane';
import type { CopyButtonProps, CopyStatus, UseCopyToClipboardOptions } from '@octanejs/interior';
import { CopyButton, useCopyToClipboard } from '@octanejs/interior';

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

// Keep OctaneNode in the probe set so renderable-type drift stays visible.
expectType<OctaneNode | null>(null);

// @ts-expect-error unknown copy statuses are rejected
const badStatus: CopyStatus = 'pending';

// @ts-expect-error value is required on CopyButtonProps
const missingValue: CopyButtonProps = {};
