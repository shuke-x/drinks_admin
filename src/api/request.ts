import { apiError,type LegacyDto } from './types';
// ------------------------------------------------------------------
// fetch 封装(请求核心)。全部接口经此发出:
//   · 统一 baseURL(API_BASE)与 query 序列化
//   · 自动携带 Authorization: Bearer <token>
//   · 兼容「裸 JSON」与「{ code, data, message } 包装」两种响应风格
//   · 错误统一规整为 { status, message }(NestJS 默认异常体亦可解析)
// 业务接口不要直接使用 fetch,统一走 request.get / post / put / patch / delete。
// ------------------------------------------------------------------

import { cookieSession,csrfHeaders,expireSession,getAccessToken,sessionGeneration } from './session';
export { REFRESH_TOKEN_KEY,TOKEN_KEY } from './session';

/** 请求前缀。后端若无 /api/v1 前缀或需要绝对地址,在 .env 里改 VITE_API_BASE */
export const API_BASE = (import.meta.env.VITE_API_BASE || '/api/v1').replace(/\/+$/, '');

const envTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS);
export const API_TIMEOUT_MS = Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : 20_000;
const UPLOAD_TIMEOUT_MS = Math.max(API_TIMEOUT_MS, 120_000);

const timeoutError = (timeoutMs: number) => ({
  status: 0,
  code: 'REQUEST_TIMEOUT',
  message: `请求超时（${Math.ceil(timeoutMs / 1000)} 秒），请检查网络后重试`,
});

/** 保证所有请求最终成功或失败，避免 fetch 长时间挂起导致页面一直 loading。 */
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = API_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { credentials: cookieSession ? 'include' : 'omit', ...options, signal: controller.signal });
  } catch (caught) { const error = apiError(caught);
    if (caught instanceof Error && caught.name === 'AbortError') throw timeoutError(timeoutMs);
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
};

const token = getAccessToken;

const unwrap = (payload: LegacyDto | null): any => {
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

const errorFrom = async (res: Response) => {
  const text = await res.text();
  let payload: any = null;
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

let refreshPromise: Promise<null> | null = null;
const refreshAccessToken = async () => {
  if (!cookieSession) { expireSession(); throw { status: 401, message: '登录已过期，请重新登录' }; }
  if (!refreshPromise) {
    const generation = sessionGeneration();
    refreshPromise = fetchWithTimeout(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { ...csrfHeaders() },
    })
      .then(async (res) => {
        if (!res.ok) throw await errorFrom(res);
        if (generation !== sessionGeneration()) throw { status: 401, message: '会话已结束' };
        return null;
      })
      .catch((error) => {
        if (generation === sessionGeneration()) expireSession();
        throw error;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

const qs = (params: Record<string, unknown> = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
};

async function send(method: string, path: string, { params, body }: { params?: Record<string, unknown>; body?: unknown } = {}, retried = false): Promise<any> {
  let res;
  try {
    res = await fetchWithTimeout(`${API_BASE}${path}${qs(params)}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        ...(!['GET', 'HEAD', 'OPTIONS'].includes(method) ? csrfHeaders() : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (caught) { const error = apiError(caught);
    if (error?.code === 'REQUEST_TIMEOUT' || error.status) throw error;
    throw { status: 0, message: `无法连接后端(${API_BASE}),请确认服务已启动、代理配置正确` };
  }

  const refreshable = !['/auth/challenge', '/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].includes(path);
  if (res.status === 401 && !retried && refreshable) {
    await refreshAccessToken();
    return send(method, path, { params, body }, true);
  }
  if (res.status === 401 && refreshable) expireSession();
  if (!res.ok) throw await errorFrom(res);
  const text = await res.text();
  if (!text) return null;
  try { return unwrap(JSON.parse(text)); } catch (caught) { const error = apiError(caught);
    if (error?.status) throw error;
    return text;
  }
}

export const request = {
  get: <T = any>(path: string, params?: Record<string, unknown>): Promise<T> => send('GET', path, { params }),
  post: <T = any>(path: string, body?: unknown): Promise<T> => send('POST', path, { body }),
  put: <T = any>(path: string, body?: unknown): Promise<T> => send('PUT', path, { body }),
  patch: <T = any>(path: string, body?: unknown): Promise<T> => send('PATCH', path, { body }),
  delete: <T = any>(path: string, body?: unknown): Promise<T> => send('DELETE', path, { body }),
  postForm: async function postForm(path: string, formData: FormData, retried = false): Promise<any> {
    let res;
    try {
      res = await fetchWithTimeout(
        `${API_BASE}${path}`,
        { method: 'POST', headers: { ...(token() ? { Authorization: `Bearer ${token()}` } : {}), ...csrfHeaders() }, body: formData },
        UPLOAD_TIMEOUT_MS,
      );
    } catch (caught) { const error = apiError(caught);
      if (error?.code === 'REQUEST_TIMEOUT' || error.status) throw error;
      throw { status: 0, message: `无法连接后端(${API_BASE}),请确认网络与服务状态` };
    }
    if (res.status === 401 && !retried) {
      await refreshAccessToken();
      return postForm(path, formData, true);
    }
    if (res.status === 401) expireSession();
    if (!res.ok) throw await errorFrom(res);
    return unwrap(await res.json().catch(() => null));
  },
};
