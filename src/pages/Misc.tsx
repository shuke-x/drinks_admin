import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export function Forbidden() {
  return (
    <div className="page page--center">
      <EmptyState
        icon="lock" title="403 · 没有访问权限"
        desc="当前账号的角色未包含访问该页面所需的权限,如需开通请联系超级管理员。"
      >
        <Link to="/" className="btn btn--soft btn--sm">回到工作台</Link>
      </EmptyState>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="page page--center">
      <EmptyState icon="glass" title="404 · 页面不存在" desc="这杯还没被调出来。">
        <Link to="/" className="btn btn--soft btn--sm">回到工作台</Link>
      </EmptyState>
    </div>
  );
}
