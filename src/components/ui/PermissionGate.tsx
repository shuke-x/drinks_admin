import { usePermission } from './usePermission';
export function PermissionGate({ perm, fallback=null, children }) { const can = usePermission(); return can(perm) ? children : fallback; }
