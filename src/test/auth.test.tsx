import { configureStore } from '@reduxjs/toolkit';
import { render,screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter,Route,Routes } from 'react-router-dom';
import { beforeEach,describe,expect,it,vi } from 'vitest';
import { api } from '../api';
import { normSession } from '../api/normalize';
import { clearSession,getAccessToken,purgeLegacyTokens,setAccessToken } from '../api/session';
import { RequireAuth,RequirePerm } from '../layout/guards';
import { rootReducer } from '../store';
import auth,{ loggedOut,restoreSession } from '../store/authSlice';

beforeEach(() => clearSession());
const profile = { user: { id: 'admin', nickname: '管理', accountSource: 'admin', roles: [] }, permissions: ['roles.read'] };
function routes(status: string, permissions: string[] = []) {
  const initial = auth(undefined, { type: '@@init' });
  const store = configureStore({ reducer: { auth }, preloadedState: { auth: { ...initial, status, permissions } } });
  render(<Provider store={store}><MemoryRouter initialEntries={['/roles']}><Routes>
    <Route path="/login" element={<p>登录页</p>} /><Route path="/403" element={<p>无权限</p>} />
    <Route element={<RequireAuth />}><Route path="/roles" element={<RequirePerm perm="roles.read"><p>角色内容</p></RequirePerm>} /></Route>
  </Routes></MemoryRouter></Provider>);
}
describe('session and protected routes', () => {
  it('never copies flat response credentials into the Redux user profile', () => {
    const session = normSession({ id: 'admin', accessToken: 'secret', refresh_token: 'refresh', permissions: [] });
    expect(session.user).not.toHaveProperty('accessToken'); expect(session.user).not.toHaveProperty('refresh_token');
  });
  it('ignores restoration that finishes after logout', async () => {
    setAccessToken('temporary');
    let resolve!: (value: typeof profile) => void;
    vi.spyOn(api.auth, 'me').mockReturnValue(new Promise(done => { resolve = done; }));
    const store = configureStore({ reducer: rootReducer });
    const restoring = store.dispatch(restoreSession()); store.dispatch(loggedOut());
    resolve(profile); await restoring;
    expect(store.getState().auth.status).toBe('idle'); expect(store.getState().auth.user).toBeNull();
  });
  it('purges persisted tokens and expires the in-memory bearer after ten minutes', () => {
    localStorage.setItem('backbar_token', 'old'); localStorage.setItem('backbar_refresh_token', 'old');
    purgeLegacyTokens(); expect(localStorage.getItem('backbar_token')).toBeNull(); expect(localStorage.getItem('backbar_refresh_token')).toBeNull();
    setAccessToken('temporary'); expect(getAccessToken()).toBe('temporary');
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 600_001); expect(getAccessToken()).toBeNull();
  });
  it('restores user and permissions and clears them on logout', async () => {
    setAccessToken('temporary'); vi.spyOn(api.auth, 'me').mockResolvedValue(profile);
    const store = configureStore({ reducer: rootReducer });
    await store.dispatch(restoreSession()); expect(store.getState().auth.status).toBe('ready');
    expect(store.getState().auth.permissions).toEqual(['roles.read']);
    store.dispatch(loggedOut()); expect(store.getState().auth.user).toBeNull(); expect(getAccessToken()).toBeNull();
  });
  it('clears a rejected restoration', async () => {
    setAccessToken('expired'); vi.spyOn(api.auth, 'me').mockRejectedValue({ status: 401, message: '过期' });
    const store = configureStore({ reducer: rootReducer }); await store.dispatch(restoreSession());
    expect(store.getState().auth.status).toBe('idle'); expect(getAccessToken()).toBeNull();
  });
  it('waits for restoration without showing protected content', () => { routes('restoring'); expect(screen.getByText('正在恢复登录状态…')).toBeInTheDocument(); expect(screen.queryByText('角色内容')).toBeNull(); });
  it('redirects anonymous sessions', () => { routes('idle'); expect(screen.getByText('登录页')).toBeInTheDocument(); });
  it('denies missing permission', () => { routes('ready'); expect(screen.getByText('无权限')).toBeInTheDocument(); });
  it('allows the required permission', () => { routes('ready', ['roles.read']); expect(screen.getByText('角色内容')).toBeInTheDocument(); });
});
