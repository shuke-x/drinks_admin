import { useEffect } from 'react';
export function useEsc(open: boolean, onClose?: () => void) { useEffect(() => { if (!open) return undefined; const key = (event: KeyboardEvent) => event.key === 'Escape' && onClose?.(); window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [open, onClose]); }
