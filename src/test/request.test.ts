import { afterEach,describe,expect,it,vi } from 'vitest';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); document.cookie = 'backbar_csrf=; Max-Age=0; path=/'; });
async function client(mode: string) { vi.resetModules(); vi.stubEnv('VITE_AUTH_MODE', mode); return import('../api/request'); }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('cookie and bearer transport', () => {
  it('sends credentials and CSRF header on JSON and upload mutations', async () => {
    const { request } = await client('cookie'); document.cookie = 'backbar_csrf=proof; path=/';
    const fetch = vi.fn().mockResolvedValue(json({ ok: true })); vi.stubGlobal('fetch', fetch);
    await request.patch('/admin/roles/test', { name: 'new' });
    expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: 'include', headers: { 'X-CSRF-Token': 'proof' } });
    fetch.mockResolvedValue(json({ ok: true }));
    await request.postForm('/upload/image', new FormData());
    expect(fetch.mock.calls[1][1]).toMatchObject({ credentials: 'include', headers: { 'X-CSRF-Token': 'proof' } });
  });
  it('refuses unsafe cookie requests without CSRF credentials', async () => {
    const { request } = await client('cookie'); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(request.post('/admin/roles', {})).rejects.toMatchObject({ status: 403 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('shares one refresh across concurrent 401 responses and retries once', async () => {
    const { request } = await client('cookie'); document.cookie = 'backbar_csrf=proof; path=/';
    const counts = new Map<string, number>();
    const fetch = vi.fn(async (url: string) => {
      counts.set(url, (counts.get(url) ?? 0) + 1);
      if (url.endsWith('/auth/refresh')) return new Response(null, { status: 204 });
      return counts.get(url) === 1 ? json({}, 401) : json({ id: url });
    }); vi.stubGlobal('fetch', fetch);
    await Promise.all([request.get('/auth/me'), request.get('/admin/roles')]);
    expect([...counts.entries()].find(([url]) => url.endsWith('/auth/refresh'))?.[1]).toBe(1);
    const refresh = fetch.mock.calls.find(([url]) => url.endsWith('/auth/refresh'));
    expect(refresh).toBeDefined();
    expect(localStorage.getItem('backbar_refresh_token')).toBeNull();
  });
  it('does not refresh an expired bearer or send cookies in compatibility mode', async () => {
    const { request } = await client('memory'); const session = await import('../api/session'); session.setAccessToken('access');
    const fetch = vi.fn().mockResolvedValue(json({}, 401)); vi.stubGlobal('fetch', fetch);
    await expect(request.get('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledOnce(); expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: 'omit', headers: { Authorization: 'Bearer access' } });
    expect(session.getAccessToken()).toBeNull();
  });
});
