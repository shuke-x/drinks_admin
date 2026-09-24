import type { LegacyDto } from '../types';
// ------------------------------------------------------------------
// 审计日志模块(文档 4.3 · /admin/audit-logs,只读)
// ------------------------------------------------------------------
import { normList,normUser } from '../normalize';
import { request } from '../request';

export const auditApi = {
  /** GET /admin/audit-logs —— page / pageSize / targetType / action / actorId */
  async list(params: LegacyDto = {}) {
    const query = {
      page: params.page,
      limit: params.pageSize,
      targetType: params.targetType,
      action: params.action,
      actorId: params.actorId,
    };
    const page = normList(await request.get('/admin/audit-logs', query), params.page, params.pageSize);
    return {
      ...page,
      items: page.items.map((item): LegacyDto => ({
        ...item,
        actor: item.actor ? normUser(item.actor) : null,
      })),
    };
  },
};
