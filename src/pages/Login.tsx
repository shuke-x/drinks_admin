import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginThunk } from '../store/authSlice';
import { API_BASE, USE_MOCK } from '../api';
import { Button, Field, Icon, Input } from '../components/ui';
import { HotPoster } from '../components/HotPoster';
import { FadeContent, ImageTrail, SplitText } from '../components/react-bits';
import { FloatingLines } from '../components/react-bits/official';

const QUICK_ACCOUNTS = [
  { label: '超级管理员', email: 'admin@bar.dev', password: 'admin123', hint: '全部权限' },
  { label: '运营', email: 'operator@bar.dev', password: 'operator123', hint: '用户启停 · 上下架' },
  { label: '审核员', email: 'reviewer@bar.dev', password: 'reviewer123', hint: '仅审核通过 / 驳回' },
];

const BRAND_TRAIL_COCKTAILS = [
  { name: '金汤力', baseSpirit: 'gin', abv: 12, weeklyViews: 2874, likes: 436 },
  { name: '尼格罗尼', baseSpirit: 'gin', abv: 24, weeklyViews: 2103, likes: 389 },
  { name: '莫吉托', baseSpirit: 'rum', abv: 12, weeklyViews: 3421, likes: 512 },
  { name: '金菲士', baseSpirit: 'gin', abv: 13, weeklyViews: 1562, likes: 201 },
];

const LOGIN_FLOATING_LINE_WAVES: Array<'middle'> = ['middle'];
const LOGIN_FLOATING_LINE_GRADIENT = ['#e945f5', '#6f6f6f', '#6a6a6a'];
const LOGIN_FLOATING_LINE_BOTTOM_POSITION = { x: 2, y: -0.7, rotate: -0.4 };

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, status, loggingIn, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ email: '', password: '' });

  if (token && status !== 'restoring') {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    const res = await dispatch(loginThunk(form));
    if (loginThunk.fulfilled.match(res)) {
      navigate(location.state?.from?.pathname || '/', { replace: true });
    }
  };

  return (
    <div className="login">
      <FloatingLines
        enabledWaves={LOGIN_FLOATING_LINE_WAVES}
        lineCount={8}
        lineDistance={8}
        bottomWavePosition={LOGIN_FLOATING_LINE_BOTTOM_POSITION}
        bendRadius={8}
        bendStrength={-2}
        interactive={false}
        parallax
        animationSpeed={1}
        linesGradient={LOGIN_FLOATING_LINE_GRADIENT}
      />
      <section className="login__brand">
        <ImageTrail
          className="login__trail"
          items={BRAND_TRAIL_COCKTAILS.map((cocktail, index) => (
            <HotPoster key={cocktail.name} cocktail={cocktail} rank={index + 1} />
          ))}
        >
          <p className="login__trail-hint"><Icon name="glass" size={14} />移动光标，探索本周热门酒单</p>
        </ImageTrail>
        <div className="login__brand-inner">
          <div className="login__mark"><Icon name="glass" size={20} /></div>
          <SplitText as="h1" text="Backbar" className="login__title" delay={70} />
          <FadeContent delay={500}>
            <p className="login__tagline">酒单先入库,审核后见客。</p>
            <ul className="login__points">
              <li>draft → pending → published 的完整状态机</li>
              <li>基于权限码的 RBAC,而非一个 isAdmin 布尔值</li>
              <li>每一次审核与后台写操作,都会留下日志</li>
            </ul>
          </FadeContent>
        </div>
      </section>

      <section className="login__panel">
        <FadeContent delay={120} className="login__card">
          <h2 className="login__card-title">登录管理后台</h2>
          <p className="login__card-sub">仅拥有后台权限的账号可以进入</p>

          <form onSubmit={submit} className="login__form">
            <Field label="邮箱">
              <Input
                type="email" required autoComplete="username" placeholder="you@bar.dev"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="密码">
              <Input
                type="password" required autoComplete="current-password" placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            {error && <p className="login__error"><Icon name="ban" size={14} />{error}</p>}
            <Button type="submit" loading={loggingIn} className="login__submit">登录</Button>
          </form>

          {USE_MOCK ? (
            <>
              <div className="login__divider"><span>演示账号,点击填充</span></div>
              <div className="login__accounts">
                {QUICK_ACCOUNTS.map((a) => (
                  <button
                    key={a.email} type="button" className="login__account"
                    onClick={() => setForm({ email: a.email, password: a.password })}
                  >
                    <span className="login__account-name">{a.label}</span>
                    <span className="login__account-hint">{a.hint}</span>
                    <span className="login__account-email">{a.email}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="login__mode-note">
              已连接后端 <code>{API_BASE}</code>,请使用真实账号登录;
              离线演示可在 .env 中设置 <code>VITE_USE_MOCK=1</code>。
            </p>
          )}
        </FadeContent>
      </section>
    </div>
  );
}
