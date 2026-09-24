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
// 全部接口连接真实后端。
// ------------------------------------------------------------------

import { auditApi } from './modules/audit';
import { authApi } from './modules/auth';
import { categoryApi } from './modules/category';
import { cocktailApi } from './modules/cocktail';
import { dailyRecommendationApi } from './modules/dailyRecommendation';
import { dashboardApi } from './modules/dashboard';
import { roleApi } from './modules/role';
import { userApi } from './modules/user';

export { API_BASE,REFRESH_TOKEN_KEY,TOKEN_KEY } from './request';

export const api = {
  auth: authApi,
  user: userApi,
  cocktail: cocktailApi,
  role: roleApi,
  audit: auditApi,
  dashboard: dashboardApi,
  category: categoryApi,
  dailyRecommendation: dailyRecommendationApi,
};
