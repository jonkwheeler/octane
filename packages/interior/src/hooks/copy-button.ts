import { useCallback, useEffect, useRef, useState } from 'octane';
import { resolveHookSlot, subSlot } from './slot';

export type CopyStatus = 'idle' | 'copied' | 'error';

export type UseCopyToClipboardOptions = {
  timeout?: number;
  onCopy?: (value: string) => void;
  onError?: (reason: unknown) => void;
};

function writeFallback(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.left = '0';
  area.style.opacity = '0';
  document.body.appendChild(area);

  const selection = document.getSelection();
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }

  document.body.removeChild(area);
  if (selection && previous) {
    selection.removeAllRanges();
    selection.addRange(previous);
  }
  return ok;
}

export function useCopyToClipboard(
  { timeout = 2000, onCopy, onError }: UseCopyToClipboardOptions = {},
  ...rest: [slot?: symbol]
) {
  const slot = resolveHookSlot(rest);
  const [status, setStatus] = useState<CopyStatus>('idle', subSlot(slot, 'status'));
  const [ticket, setTicket] = useState(0, subSlot(slot, 'ticket'));

  const mounted = useRef(true, subSlot(slot, 'mounted'));
  const copied = useRef(onCopy, subSlot(slot, 'copied'));
  copied.current = onCopy;
  const failed = useRef(onError, subSlot(slot, 'failed'));
  failed.current = onError;

  useEffect(function trackMounted() {
    mounted.current = true;
    return function unmount() {
      mounted.current = false;
    };
  }, [], subSlot(slot, 'mount-effect'));

  const reset = useCallback(function resetCopy() {
    setStatus('idle');
    setTicket(0);
  }, [], subSlot(slot, 'reset'));

  const copy = useCallback(async function copyText(text: string) {
    if (!text) return false;

    let ok = false;
    let reason: unknown = null;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      } else {
        ok = writeFallback(text);
      }
    } catch (error) {
      reason = error;
      try {
        ok = writeFallback(text);
      } catch {
        ok = false;
      }
    }

    if (!mounted.current) return ok;

    setStatus(ok ? 'copied' : 'error');
    setTicket(function increment(t) {
      return t + 1;
    });

    if (ok) copied.current?.(text);
    else failed.current?.(reason);

    return ok;
  }, [], subSlot(slot, 'copy'));

  useEffect(function resetAfterTimeout() {
    if (ticket === 0 || status === 'idle') return;
    const id = setTimeout(function clearStatus() {
      setStatus('idle');
    }, timeout);
    return function cleanup() {
      clearTimeout(id);
    };
  }, [ticket, status, timeout], subSlot(slot, 'timeout-effect'));

  return { copy, reset, status, copied: status === 'copied' };
}
