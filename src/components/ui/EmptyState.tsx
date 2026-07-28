import { Icon } from './Icon';
export function EmptyState({ icon='glass', title, desc, children }) { return <div className="empty"><div className="empty__icon"><Icon name={icon} size={22} /></div><p className="empty__title">{title}</p>{desc && <p className="empty__desc">{desc}</p>}{children}</div>; }
