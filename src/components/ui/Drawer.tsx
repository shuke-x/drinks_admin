import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import type { DialogProps } from './dialogTypes';
import { useDialog } from './useDialog';
export function Drawer({ open, title, subtitle, onClose, children, footer }: DialogProps) { const ref = useDialog(open,onClose); if(!open)return null; return createPortal(<div className="overlay overlay--right" onMouseDown={(e)=>e.target===e.currentTarget&&onClose?.()}><div className="drawer" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}><header className="modal__head"><div><h3 className="modal__title">{title}</h3>{subtitle&&<p className="modal__subtitle">{subtitle}</p>}</div><button className="icon-btn" onClick={onClose} aria-label="关闭"><Icon name="x"/></button></header><div className="drawer__body">{children}</div>{footer&&<footer className="modal__foot">{footer}</footer>}</div></div>,document.body); }
