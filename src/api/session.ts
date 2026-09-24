/** Bearer compatibility mode never persists credentials. Cookie mode requires server support. */
export const cookieSession = import.meta.env.VITE_AUTH_MODE === 'cookie';
export const TOKEN_KEY = 'backbar_token';
export const REFRESH_TOKEN_KEY = 'backbar_refresh_token';
let accessToken: string | null = null;
let expiresAt = 0;
let generation = 0;

export function purgeLegacyTokens() {
  for (const key of [TOKEN_KEY, REFRESH_TOKEN_KEY]) {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
  }
}
purgeLegacyTokens();
export const getAccessToken = () => {
  if (Date.now() >= expiresAt) accessToken = null;
  return accessToken;
};
export const sessionGeneration = () => generation;
export function setAccessToken(value: string | null) { accessToken = value; expiresAt = Date.now() + 10 * 60_000; }
export function clearSession() { accessToken = null; generation += 1; purgeLegacyTokens(); }
export function expireSession() {
  clearSession();
  window.dispatchEvent(new Event('backbar:session-expired'));
}

/** Server issues a non-secret CSRF cookie and verifies the matching header plus Origin. */
export function csrfHeaders(): Record<string, string> {
  if (!cookieSession) return {};
  const value = document.cookie.split('; ').find((entry) => entry.startsWith('backbar_csrf='))?.slice(13);
  if (!value) throw { status: 403, message: '缺少 CSRF 凭据，请刷新页面后重试' };
  return { 'X-CSRF-Token': decodeURIComponent(value) };
}
