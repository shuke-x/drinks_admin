import { Navigate,Outlet,useLocation } from 'react-router-dom';
import { Spinner,usePermission } from '../components/ui';
import { useAppSelector as useSelector } from '../store/hooks';

/** 未登录跳转 /login;会话恢复中显示加载态 */
export function RequireAuth() {
  const { status } = useSelector((s) => s.auth);
  const location = useLocation();
  if (status === 'restoring') {
    return <div className="fullscreen-loading"><Spinner label="正在恢复登录状态…" /></div>;
  }
  if (status !== 'ready') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** 无对应权限跳转 403(对应后端 PermissionsGuard) */
export function RequirePerm({ perm, children }: { perm: string; children: React.ReactNode }) {
  const can = usePermission();
  if (!can(perm)) return <Navigate to="/403" replace />;
  return children;
}
