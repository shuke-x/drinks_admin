import type { LegacyDto } from '../types';
// ------------------------------------------------------------------
// 用户管理模块(文档 4.3 · /admin/users)
// ------------------------------------------------------------------
import { EMPTY_STATS,asArr,normCocktail,normList,normUser } from '../normalize';
import { request } from '../request';

export const userApi = {
  /** POST /admin/users —— 管理员直接创建账号并可分配初始角色 */
  async create(body: LegacyDto) {
    const raw = await request.post('/admin/users', body);
    return { user: normUser(raw?.user ?? raw ?? {}) };
  },

  /** GET /admin/users —— 支持 page / pageSize / status / keyword */
  async list(params: LegacyDto = {}) {
    const query = {
      page: params.page,
      limit: params.pageSize,
      status: params.status,
      accountSource: params.accountSource,
      search: params.keyword,
    };
    const pg = normList(await request.get('/admin/users', query), params.page, params.pageSize);
    return { ...pg, items: pg.items.map(normUser) };
  },

  /** GET /admin/users/:id —— 详情 + 投稿统计 + 最近内容 */
  async detail(id: string) {
    const raw = await request.get(`/admin/users/${id}`) || {};
    return {
      user: normUser(raw.user ?? raw),
      stats: { ...EMPTY_STATS, ...(raw.stats || {}) },
      recentCocktails: asArr(raw.recentCocktails ?? raw.cocktails).map(normCocktail),
    };
  },

  /** PATCH /admin/users/:id/status —— { status, reason? },禁用必须带原因 */
  async updateStatus(id: string, body: LegacyDto) {
    const raw = await request.patch(`/admin/users/${id}/status`, body);
    return { user: normUser(raw?.user ?? raw ?? {}) };
  },

  /** PUT /admin/users/:id/roles —— { roleIds } 全量替换角色集合 */
  async setRoles(id: string, body: LegacyDto) {
    const raw = await request.put(`/admin/users/${id}/roles`, body);
    return { user: normUser(raw?.user ?? raw ?? {}) };
  },

  /** DELETE /admin/users/:id —— 仅超级管理员 */
  remove: (id: string) => request.delete(`/admin/users/${id}`),
};
