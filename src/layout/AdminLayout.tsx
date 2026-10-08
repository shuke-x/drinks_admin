import { NavLink,Outlet,useLocation,useNavigate } from 'react-router-dom';
import { API_BASE,api } from '../api';
import { PERMISSION } from '../auth/permissions';
import { ThemeToggle } from '../components/ThemeToggle';
import { ShinyText } from '../components/react-bits';
import { SideRays } from '../components/react-bits/official';
import { Avatar,Chip,Icon,usePermission } from '../components/ui';
import { loggedOut } from '../store/authSlice';
import { useAppDispatch as useDispatch,useAppSelector as useSelector } from '../store/hooks';
import { useTheme } from '../theme/theme';

const NAV = [
  { to: '/drink-records', label: '品饮记录', icon: 'glass', perm: PERMISSION.RECORDS_REVIEW },
  { to: '/reports', label: '内容举报', icon: 'shield', perm: PERMISSION.REPORTS_MANAGE },
  { to: '/flavor-directions', label: '风味配置', icon: 'grid', perm: PERMISSION.FLAVORS_MANAGE },
  { to: '/', label: '工作台', icon: 'grid', end: true },
  { to: '/cocktails', label: '酒单管理', icon: 'glass', perm: PERMISSION.COCKTAILS_READ },
  { to: '/categories', label: '基酒分类', icon: 'grid', perm: PERMISSION.CATEGORIES_MANAGE },
  { to: '/daily-recommendations', label: '今日推荐', icon: 'glass', perm: PERMISSION.RECOMMENDATIONS_MANAGE },
  { to: '/users', label: '用户管理', icon: 'users', perm: PERMISSION.USERS_READ },
  { to: '/roles', label: '角色与权限', icon: 'shield', perm: PERMISSION.ROLES_READ },
  { to: '/audit-logs', label: '审计日志', icon: 'scroll', perm: PERMISSION.AUDIT_LOGS_READ },
];

const TITLES = [
  { match: /^\/drink-records/, title: '品饮记录审核' },
  { match: /^\/reports/, title: '用户内容举报' },
  { match: /^\/flavor-directions/, title: '风味配置与匹配规则' },
  { match: /^\/cocktails\/.+/, title: '酒单详情' },
  { match: /^\/cocktails/, title: '酒单管理' },
  { match: /^\/categories/, title: '基酒分类管理' },
  { match: /^\/daily-recommendations/, title: '今日推荐 Banner' },
  { match: /^\/users/, title: '用户管理' },
  { match: /^\/roles/, title: '角色与权限' },
  { match: /^\/audit-logs/, title: '审计日志' },
  { match: /^\/$/, title: '工作台' },
];

export default function AdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useSelector((s) => s.auth.user);
  const can = usePermission();
  const { theme, toggleTheme } = useTheme();

  const title = TITLES.find((t) => t.match.test(pathname))?.title || 'Backbar';

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      window.alert('本地会话已退出，但服务端注销未完成。请恢复网络后重试注销。');
    } finally {
      dispatch(loggedOut());
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="shell">
      <SideRays
        origin="top-left"
        speed={1.4}
        rayColor1="#d2d2d2"
        rayColor2="#777777"
        intensity={0.72}
        spread={1.35}
        saturation={0}
        blend={0.6}
        falloff={1.75}
        opacity={0.36}
      />
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__mark"><Icon name="glass" size={17} /></span>
          <div>
            <ShinyText text="Backbar" className="sidebar__name" />
            <span className="sidebar__sub">酒单后台管理</span>
          </div>
        </div>

        <nav className="sidebar__nav">
          {NAV.filter((item) => can(item.perm)).map((item) => (
            <NavLink
              key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
            >
              <Icon name={item.icon} size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__foot">
          <div className="sidebar__env">
            <span className="sidebar__env-dot" />
            {`后端接口 · ${API_BASE}`}
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1 className="topbar__title">{title}</h1>
          <div className="topbar__right">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            {user && (
              <div className="topbar__user">
                <Avatar name={user.nickname} id={user.id} size="sm" />
                <div className="topbar__user-meta">
                  <span className="topbar__nick">{user.nickname}</span>
                  <span className="topbar__roles">
                    {user.roles.map((r) => <Chip key={r.id} tone="amber">{r.name}</Chip>)}
                  </span>
                </div>
              </div>
            )}
            <button className="icon-btn" title="退出登录" onClick={logout}>
              <Icon name="logout" size={16} />
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
