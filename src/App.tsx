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
import Categories from './pages/Categories';
import DailyRecommendations from './pages/DailyRecommendations';
import { Forbidden, NotFound } from './pages/Misc';
import { PERMISSION } from './auth/permissions';

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
            <Route path="cocktails" element={<RequirePerm perm={PERMISSION.COCKTAILS_READ}><Cocktails /></RequirePerm>} />
            <Route path="cocktails/:id" element={<RequirePerm perm={PERMISSION.COCKTAILS_READ}><CocktailDetail /></RequirePerm>} />
            <Route path="categories" element={<RequirePerm perm={PERMISSION.CATEGORIES_MANAGE}><Categories /></RequirePerm>} />
            <Route path="daily-recommendations" element={<RequirePerm perm={PERMISSION.RECOMMENDATIONS_MANAGE}><DailyRecommendations /></RequirePerm>} />
            <Route path="users" element={<RequirePerm perm={PERMISSION.USERS_READ}><Users /></RequirePerm>} />
            <Route path="roles" element={<RequirePerm perm={PERMISSION.ROLES_READ}><Roles /></RequirePerm>} />
            <Route path="audit-logs" element={<RequirePerm perm={PERMISSION.AUDIT_LOGS_READ}><AuditLogs /></RequirePerm>} />
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
