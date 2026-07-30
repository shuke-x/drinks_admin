// ------------------------------------------------------------------
// 认证模块
// ------------------------------------------------------------------
import { REFRESH_TOKEN_KEY, request, TOKEN_KEY } from '../request';
import { normSession } from '../normalize';

const toBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const importRsaPublicKey = async (pem) => {
  const der = Uint8Array.from(atob(String(pem).replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '')), (char) => char.charCodeAt(0));
  return crypto.subtle.importKey('spki', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
};
const encrypt = async (key, value) => toBase64(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, new TextEncoder().encode(value)));

export const authApi = {
  /** GET /auth/challenge -> RSA-OAEP(SHA-256) -> POST /auth/login。 */
  async login(body) {
    const challenge = await request.get('/auth/challenge');
    const publicKey = challenge?.publicKey ?? challenge?.public_key ?? challenge?.key;
    const challengeId = challenge?.challengeId ?? challenge?.challenge_id ?? challenge?.id;
    if (!publicKey || !challengeId) throw { status: 500, message: '登录挑战响应缺少 publicKey 或 challengeId' };
    if (!globalThis.crypto?.subtle) throw { status: 500, message: '当前浏览器不支持 Web Crypto，无法安全登录' };
    const key = await importRsaPublicKey(publicKey);
    const ciphertext = await encrypt(key, JSON.stringify({ email: body.email, password: body.password }));
    const raw = await request.post('/auth/login', { challengeId, ciphertext });
    const s = normSession(raw);
    s.refreshToken = raw?.refreshToken ?? raw?.refresh_token ?? null;
    if (!s.token) throw { status: 500, message: '登录响应中未找到 token 字段,请检查后端返回结构' };
    if (s.user?.id && s.permissions.length) return s;
    localStorage.setItem(TOKEN_KEY, s.token); // 后续 /auth/me 需要携带
    try {
      const me = normSession(await request.get('/auth/me'));
      return { token: s.token, refreshToken: s.refreshToken, user: me.user, permissions: me.permissions };
    } catch (e) {
      localStorage.removeItem(TOKEN_KEY);
      throw e;
    }
  },

  /** GET /auth/me */
  async me() {
    const me = normSession(await request.get('/auth/me'));
    return { user: me.user, permissions: me.permissions };
  },

  /** POST /auth/logout，撤销当前 refresh token。 */
  async logout() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) await request.post('/auth/logout', { refreshToken });
  },
};
