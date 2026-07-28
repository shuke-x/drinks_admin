import { useEffect } from 'react';
export function useEsc(open, onClose) { useEffect(() => { if (!open) return undefined; const key = (event) => event.key === 'Escape' && onClose?.(); window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [open, onClose]); }
