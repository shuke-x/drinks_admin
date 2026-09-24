import type { LegacyDto } from '../types';
// ------------------------------------------------------------------
// 酒单模块(文档 4.3 · /admin/cocktails,含审核动作)
// ------------------------------------------------------------------
import { asArr,normCocktail,normList,normUser } from '../normalize';
import { request } from '../request';

const action = async (id: string, name: string, body?: LegacyDto) => {
  const raw = await request.post(`/admin/cocktails/${id}/${name}`, body);
  return { cocktail: normCocktail(raw?.cocktail ?? raw ?? {}) };
};

export const cocktailApi = {
  /** GET /admin/cocktails —— page / pageSize / status / baseSpirit / ownerId / keyword */
  async list(params: LegacyDto = {}) {
    const query = {
      page: params.page,
      limit: params.pageSize,
      status: params.status,
      spirit: params.baseSpirit,
      search: params.keyword,
      ownerId: params.ownerId,
    };
    const pg = normList(await request.get('/admin/cocktails', query), params.page, params.pageSize);
    return { ...pg, items: pg.items.map(normCocktail) };
  },

  /** GET /admin/cocktails/:id —— 详情 + 流转历史 */
  async detail(id: string) {
    const raw = await request.get(`/admin/cocktails/${id}`) || {};
    return {
      cocktail: normCocktail(raw.cocktail ?? raw),
      reviewLogs: asArr(raw.reviewLogs ?? raw.logs).map((log) => ({
        ...log,
        reviewer: log.reviewer ? normUser(log.reviewer) : null,
      })),
    };
  },

  /** POST /admin/cocktails/:id/approve —— 仅 pending 可通过 */
  approve: (id: string) => action(id, 'approve'),
  /** POST /admin/cocktails/:id/reject —— { reason } 必填 */
  reject: (id: string, body: LegacyDto) => action(id, 'reject', body),
  /** POST /admin/cocktails/:id/offline —— { reason } 必填,仅 published 可下架 */
  offline: (id: string, body: LegacyDto) => action(id, 'offline', body),
  /** POST /admin/cocktails/:id/publish —— 仅 offline 可重新上架 */
  publish: (id: string) => action(id, 'publish'),

  /** PATCH /admin/cocktails/:id —— 运营修订(白名单字段,后端记快照) */
  async update(id: string, patch: LegacyDto) {
    const raw = await request.patch(`/admin/cocktails/${id}`, {
      zh: patch.name,
      en: patch.nameEn,
      spirit: patch.baseSpirit,
      abv: patch.abv,
      story: patch.description,
      tags: patch.tags,
      images: patch.imageUrl ? [patch.imageUrl] : [],
    });
    return { cocktail: normCocktail(raw?.cocktail ?? raw ?? {}) };
  },

  /** POST /admin/import-jobs —— 创建异步导入任务（仅 imports.manage）。 */
  createImportJob: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request.postForm('/admin/import-jobs', form);
  },
  listImportJobs: (params: LegacyDto = {}) => request.get('/admin/import-jobs', {
    page: params.page,
    limit: params.pageSize,
  }),

  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request.postForm('/upload/image?purpose=cocktail', form);
  },

  /** DELETE /admin/cocktails/:id —— 软删除 */
  remove: (id: string) => request.delete(`/admin/cocktails/${id}`),
  clearAll: () => request.delete('/admin/cocktails'),
};
