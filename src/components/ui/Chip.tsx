export function Chip({ tone='default', children }: { tone?: string; children?: React.ReactNode }) { return <span className={`chip chip--${tone}`}>{children}</span>; }
