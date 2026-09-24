import type { ReactNode } from 'react';
export interface DialogProps { open: boolean; title: string; subtitle?: string; width?: number; footer?: ReactNode; onClose?: () => void; children?: ReactNode }
