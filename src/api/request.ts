// ------------------------------------------------------------------
// fetch 封装(请求核心)。全部接口经此发出:
//   · 统一 baseURL(API_BASE)与 query 序列化
//   · 自动携带 Authorization: Bearer <token>
//   · 兼容「裸 JSON」与「{ code, data, message } 包装」两种响应风格
//   · 错误统一规整为 { status, message }(NestJS 默认异常体亦可解析)
// 业务接口不要直接使用 fetch,统一走 request.get / post / put / patch / delete。
// ------------------------------------------------------------------

export const TOKEN_KEY = 'backbar_token';
export const REFRESH_TOKEN_KEY = 'backbar_refresh_token';

/** 请求前缀。后端若无 /api/v1 前缀或需要绝对地址,在 .env 里改 VITE_API_BASE */
export const API_BASE = (import.meta.env.VITE_API_BASE || '/api/v1').replace(/\/+$/, '');

const token = () => localStorage.getItem(TOKEN_KEY) || '';

const unwrap = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;
  if (
    payload.code !== undefined &&
    payload.code !== 0 &&
    payload.code !== 200 &&
    payload.success !== true
  ) {
    throw { status: 200, message: payload.message || `业务错误(code=${payload.code})` };
  }
  if (!('data' in payload)) return payload;
  if (payload.meta && Array.isArray(payload.data)) {
    return {
      items: payload.data,
      total: payload.meta.total,
      page: payload.meta.page,
      pageSize: payload.meta.limit,
    };
  }
  return payload.data;
};

const errorFrom = async (res) => {
  const text = await res.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  let message = res.statusText || '请求失败';
  if (payload && typeof payload === 'object') {
    const value = payload.message ?? payload.error ?? payload.msg;
    message = Array.isArray(value) ? value.join(';') : (value || message);
  } else if (typeof payload === 'string' && payload.trim()) {
    message = payload.slice(0, 200);
  }
  return { status: res.status, message };
};

let refreshPromise = null;
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw { status: 401, message: '登录已过期，请重新登录' };
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) throw await errorFrom(res);
        const raw = unwrap(await res.json());
        if (!raw?.accessToken || !raw?.refreshToken)
          throw { status: 401, message: '刷新登录状态失败' };
        localStorage.setItem(TOKEN_KEY, raw.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, raw.refreshToken);
        return raw.accessToken;
      })
      .catch((error) => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        throw error;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

const qs = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.append(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
};

async function send(method, path, { params, body } = {}, retried = false) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}${qs(params)}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw { status: 0, message: `无法连接后端(${API_BASE}),请确认服务已启动、代理配置正确` };
  }

  const refreshable = !['/auth/challenge', '/auth/login', '/auth/register', '/auth/refresh'].includes(path);
  if (res.status === 401 && !retried && refreshable) {
    await refreshAccessToken();
    return send(method, path, { params, body }, true);
  }
  if (!res.ok) throw await errorFrom(res);
  const text = await res.text();
  if (!text) return null;
  try { return unwrap(JSON.parse(text)); } catch (error) {
    if (error?.status) throw error;
    return text;
  }
}

export const request = {
  get: (path, params) => send('GET', path, { params }),
  post: (path, body) => send('POST', path, { body }),
  put: (path, body) => send('PUT', path, { body }),
  patch: (path, body) => send('PATCH', path, { body }),
  delete: (path, body) => send('DELETE', path, { body }),
  postForm: async function postForm(path, formData, retried = false) {
    const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: token() ? { Authorization: `Bearer ${token()}` } : {}, body: formData });
    if (res.status === 401 && !retried) {
      await refreshAccessToken();
      return postForm(path, formData, true);
    }
    if (!res.ok) throw await errorFrom(res);
    return unwrap(await res.json().catch(() => null));
  },
};
