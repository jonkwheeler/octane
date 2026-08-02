import { createRoot, delegateEvents, useState } from 'octane';
import { OTPInput, REGEXP_ONLY_DIGITS, type RenderProps } from '@octanejs/input-otp';

delegateEvents(['blur', 'focus', 'input', 'mouseleave', 'mouseover', 'paste']);

function Slots(props: RenderProps) @{
	<div
		data-testid="input-otp-renderer"
		data-test-render-is-focused={props.isFocused || undefined}
		data-test-render-is-hovering={props.isHovering || undefined}
	>
		@for (const slot of props.slots; key props.slots.indexOf(slot)) {
			<span data-testid={`slot-${props.slots.indexOf(slot)}`} data-test-char={slot.char ?? undefined}>
				{slot.char ?? slot.placeholderChar ?? ''}
			</span>
		}
	</div>
}

function Base() @{
	<OTPInput maxLength={6} pattern={REGEXP_ONLY_DIGITS} render={(state) => <Slots {...state} />} />
}

function Props() @{
	<div>
		<OTPInput maxLength={6} disabled data-testid="input-otp-1"><span /></OTPInput>
		<OTPInput maxLength={6} inputMode="numeric" data-testid="input-otp-2"><span /></OTPInput>
		<OTPInput maxLength={6} inputMode="text" data-testid="input-otp-3"><span /></OTPInput>
		<OTPInput maxLength={6} containerClassName="testclassname" data-testid="input-otp-4"><span /></OTPInput>
		<OTPInput maxLength={3} data-testid="input-otp-5"><span /></OTPInput>
		<OTPInput maxLength={6} id="testid" name="testname" data-testid="input-otp-6"><span /></OTPInput>
		<OTPInput maxLength={6} pattern=" " data-testid="input-otp-7"><span /></OTPInput>
	</div>
}

function Autofocus() @{
	<OTPInput maxLength={6} autoFocus><span /></OTPInput>
}

function Complete() @{
	const [complete, setComplete] = useState(false);
	<OTPInput maxLength={6} disabled={complete} onComplete={() => setComplete(true)}><span /></OTPInput>
}

function PasteTransform() @{
	<OTPInput maxLength={6} pasteTransformer={(value) => value.replaceAll('-', '')}><span /></OTPInput>
}

function NoPasswordManagerPush() @{
	<OTPInput maxLength={6} pushPasswordManagerStrategy="none"><span /></OTPInput>
}

function App() @{
	const path = window.location.pathname;
	<main data-ready="true">
		@if (path === '/props') { <Props /> }
		@else if (path === '/with-autofocus') { <Autofocus /> }
		@else if (path === '/with-on-complete') { <Complete /> }
		@else if (path === '/paste-transform') { <PasteTransform /> }
		@else if (path === '/password-manager-none') { <NoPasswordManagerPush /> }
		@else { <Base /> }
	</main>
}

const root = document.querySelector('#root');
if (!(root instanceof HTMLElement)) throw new Error('Missing root');
createRoot(root).render(App);
