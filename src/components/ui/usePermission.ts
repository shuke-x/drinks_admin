import { useAppSelector as useSelector } from '../../store/hooks';
export function usePermission() { const permissions = useSelector((s) => s.auth.permissions); return (code?: string) => !code || permissions.includes(code); }
