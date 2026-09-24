import { usePermission } from './usePermission';
export function PermissionGate({ perm, fallback=null, children }: { perm: string; fallback?: React.ReactNode; children?: React.ReactNode }) { const can = usePermission(); return can(perm) ? children : fallback; }
