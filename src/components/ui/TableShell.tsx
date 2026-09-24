import { EmptyState } from './EmptyState';
import { Spinner } from './Spinner';
export function TableShell({ loading,empty,emptyProps,children }: { loading?: boolean; empty?: boolean; emptyProps?: React.ComponentProps<typeof EmptyState>; children?: React.ReactNode }) { if(loading)return <Spinner/>; if(empty)return <EmptyState {...emptyProps}/>; return <div className="table-wrap">{children}</div>; }
