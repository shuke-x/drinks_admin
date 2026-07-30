// ------------------------------------------------------------------
// 用户管理模块(文档 4.3 · /admin/users)
// ------------------------------------------------------------------
import { request } from '../request';
import { asArr, EMPTY_STATS, normCocktail, normList, normUser } from '../normalize';

export const userApi = {
  /** GET /admin/users —— 支持 page / pageSize / status / keyword */
  async list(params = {}) {
    const query = {
      page: params.page,
      limit: params.pageSize,
      status: params.status,
      search: params.keyword,
    };
    const pg = normList(await request.get('/admin/users', query), params.page, params.pageSize);
    return { ...pg, items: pg.items.map(normUser) };
  },

  /** GET /admin/users/:id —— 详情 + 投稿统计 + 最近内容 */
  async detail(id) {
    const raw = await request.get(`/admin/users/${id}`) || {};
    return {
      user: normUser(raw.user ?? raw),
      stats: { ...EMPTY_STATS, ...(raw.stats || {}) },
      recentCocktails: asArr(raw.recentCocktails ?? raw.cocktails).map(normCocktail),
    };
  },

  /** PATCH /admin/users/:id/status —— { status, reason? },禁用必须带原因 */
  async updateStatus(id, body) {
    const raw = await request.patch(`/admin/users/${id}/status`, body);
    return { user: normUser(raw?.user ?? raw ?? {}) };
  },

  /** PUT /admin/users/:id/roles —— { roleIds } 全量替换角色集合 */
  async setRoles(id, body) {
    const raw = await request.put(`/admin/users/${id}/roles`, body);
    return { user: normUser(raw?.user ?? raw ?? {}) };
  },
};
