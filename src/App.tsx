import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';
import { restoreSession } from './store/authSlice';
import { RequireAuth, RequirePerm } from './layout/guards';
import AdminLayout from './layout/AdminLayout';
import { ToastHost } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cocktails from './pages/Cocktails';
import CocktailDetail from './pages/CocktailDetail';
import Users from './pages/Users';
import Roles from './pages/Roles';
import AuditLogs from './pages/AuditLogs';
import { Forbidden, NotFound } from './pages/Misc';

export default function App() {
  const dispatch = useDispatch();
  useEffect(() => { dispatch(restoreSession()); }, [dispatch]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="cocktails" element={<RequirePerm perm="cocktails.read"><Cocktails /></RequirePerm>} />
            <Route path="cocktails/:id" element={<RequirePerm perm="cocktails.read"><CocktailDetail /></RequirePerm>} />
            <Route path="users" element={<RequirePerm perm="users.read"><Users /></RequirePerm>} />
            <Route path="roles" element={<RequirePerm perm="roles.read"><Roles /></RequirePerm>} />
            <Route path="audit-logs" element={<RequirePerm perm="audit_logs.read"><AuditLogs /></RequirePerm>} />
            <Route path="403" element={<Forbidden />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastHost />
    </>
  );
}
