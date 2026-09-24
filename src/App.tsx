import { Suspense,lazy,useEffect } from 'react';
import { Navigate,Route,Routes } from 'react-router-dom';
import { PERMISSION } from './auth/permissions';
import { ToastHost } from './components/ui';
import AdminLayout from './layout/AdminLayout';
import { RequireAuth,RequirePerm } from './layout/guards';
import { Forbidden,NotFound } from './pages/Misc';
import { loggedOut,restoreSession } from './store/authSlice';
import { useAppDispatch as useDispatch } from './store/hooks';
const DrinkRecords = lazy(() => import('./pages/DrinkRecords'));
const FlavorDirections = lazy(() => import('./pages/FlavorDirections'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Cocktails = lazy(() => import('./pages/Cocktails'));
const CocktailDetail = lazy(() => import('./pages/CocktailDetail'));
const Users = lazy(() => import('./pages/Users'));
const Roles = lazy(() => import('./pages/Roles'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Categories = lazy(() => import('./pages/Categories'));
const DailyRecommendations = lazy(() => import('./pages/DailyRecommendations'));

export default function App() {
  const dispatch = useDispatch();
  useEffect(() => { dispatch(restoreSession()); }, [dispatch]);
  useEffect(() => {
    const expire = () => { dispatch(loggedOut()); };
    window.addEventListener('backbar:session-expired', expire);
    return () => window.removeEventListener('backbar:session-expired', expire);
  }, [dispatch]);

  return (
    <>
      <Suspense fallback={<div className="fullscreen-loading" role="status">正在加载页面…</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="cocktails" element={<RequirePerm perm={PERMISSION.COCKTAILS_READ}><Cocktails /></RequirePerm>} />
            <Route path="cocktails/:id" element={<RequirePerm perm={PERMISSION.COCKTAILS_READ}><CocktailDetail /></RequirePerm>} />
            <Route path="categories" element={<RequirePerm perm={PERMISSION.CATEGORIES_MANAGE}><Categories /></RequirePerm>} />
            <Route path="daily-recommendations" element={<RequirePerm perm={PERMISSION.RECOMMENDATIONS_MANAGE}><DailyRecommendations /></RequirePerm>} />
            <Route path="drink-records" element={<RequirePerm perm={PERMISSION.RECORDS_REVIEW}><DrinkRecords /></RequirePerm>} />
            <Route path="flavor-directions" element={<RequirePerm perm={PERMISSION.FLAVORS_MANAGE}><FlavorDirections /></RequirePerm>} />
            <Route path="users" element={<RequirePerm perm={PERMISSION.USERS_READ}><Users /></RequirePerm>} />
            <Route path="roles" element={<RequirePerm perm={PERMISSION.ROLES_READ}><Roles /></RequirePerm>} />
            <Route path="audit-logs" element={<RequirePerm perm={PERMISSION.AUDIT_LOGS_READ}><AuditLogs /></RequirePerm>} />
            <Route path="403" element={<Forbidden />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      <ToastHost />
    </>
  );
}
