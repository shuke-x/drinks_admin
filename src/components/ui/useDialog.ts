import { useLayoutEffect,useRef } from 'react';

const stack: HTMLElement[] = [];
const selector = 'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';

export function useDialog(open: boolean, onClose?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const wasOpen = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  if (open && !wasOpen.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  wasOpen.current = open;
  close.current = onClose;
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = opener.current;
    const overlay = dialog.parentElement!;
    const inert = new Map<HTMLElement, boolean>();
    const isolate = () => {
      if (stack[stack.length - 1] !== dialog) return;
      for (const child of document.body.children) {
        if (child instanceof HTMLElement && child !== overlay && !inert.has(child)) {
          inert.set(child, child.inert);
          child.inert = true;
        }
      }
    };
    stack.push(dialog);
    isolate();
    const observer = new MutationObserver(isolate);
    observer.observe(document.body, { childList: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(selector))
      .filter((node) => !node.closest('[hidden],[inert]') && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden');
    const focusFirst = () => (focusable()[0] ?? dialog).focus();
    if (!dialog.contains(document.activeElement)) focusFirst();
    const keydown = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== dialog) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current?.(); }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (!items.length) { event.preventDefault(); dialog.focus(); }
      else if (event.shiftKey && index <= 0) { event.preventDefault(); items[items.length - 1].focus(); }
      else if (!event.shiftKey && (index < 0 || index === items.length - 1)) { event.preventDefault(); items[0].focus(); }
    };
    const focusin = (event: FocusEvent) => {
      if (stack[stack.length - 1] === dialog && !dialog.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', focusin);
    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', focusin);
      stack.splice(stack.indexOf(dialog), 1);
      inert.forEach((value, node) => { node.inert = value; });
      document.body.style.overflow = overflow;
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus();
    };
  }, [open]);
  return ref;
}
