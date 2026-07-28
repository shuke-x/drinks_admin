import { useSelector } from 'react-redux';
export function usePermission() { const permissions = useSelector((s) => s.auth.permissions); return (code) => !code || permissions.includes(code); }
