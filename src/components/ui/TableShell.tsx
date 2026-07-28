import { EmptyState } from './EmptyState'; import { Spinner } from './Spinner';
export function TableShell({ loading,empty,emptyProps,children }) { if(loading)return <Spinner/>; if(empty)return <EmptyState {...emptyProps}/>; return <div className="table-wrap">{children}</div>; }
