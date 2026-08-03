// ------------------------------------------------------------------
// API 出口。全部接口按业务域归类在 modules/ 下,经此统一暴露:
//
//   api.auth.login / me
//   api.user.list / detail / updateStatus / setRoles
//   api.cocktail.list / detail / approve / reject / offline / publish / update / remove
//   api.role.list / create / update
//   api.audit.list
//   api.dashboard.overview
//
// 技术栈为原生 fetch,封装在 request.js(baseURL、token、错误规整)。
// 默认直连真实后端;.env 设 VITE_USE_MOCK=1 时切换为内置 Mock(离线演示,
// 未启用时会被生产构建 tree-shake)。
// ------------------------------------------------------------------

import { authApi } from './modules/auth';
import { userApi } from './modules/user';
import { cocktailApi } from './modules/cocktail';
import { roleApi } from './modules/role';
import { auditApi } from './modules/audit';
import { dashboardApi } from './modules/dashboard';
import { categoryApi } from './modules/category';
import { dailyRecommendationApi } from './modules/dailyRecommendation';
import { mockApi } from './mockClient';

export { TOKEN_KEY, REFRESH_TOKEN_KEY, API_BASE } from './request';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === '1';

const realApi = {
  auth: authApi,
  user: userApi,
  cocktail: cocktailApi,
  role: roleApi,
  audit: auditApi,
  dashboard: dashboardApi,
  category: categoryApi,
  dailyRecommendation: dailyRecommendationApi,
};

export const api = USE_MOCK ? mockApi : realApi;
