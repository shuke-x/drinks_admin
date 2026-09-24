import type { LegacyDto } from '../types';
import { apiError } from '../types';
// ------------------------------------------------------------------
// 工作台模块。文档 4.3 未定义聚合接口:优先请求 GET /admin/dashboard,
// 后端未实现(404 / 405 / 501)时降级为用各业务模块的标准接口拼装;
// 某模块无权限(403)则静默省略,401 照常抛出触发自动登出。
// ------------------------------------------------------------------
import { asArr } from '../normalize';
import { request } from '../request';
import { auditApi } from './audit';
import { cocktailApi } from './cocktail';
import { userApi } from './user';

async function compose() {
  const soft = <T>(p: Promise<T>) => p.catch((e: { status?: number }) => { if (e.status === 401) throw e; return undefined; });
  const total = (params: LegacyDto) => cocktailApi.list({ ...params, page: 1, pageSize: 1 }).then((r) => r.total);

  const [pending, published, offline, rejected, draft, queue, hot, uAll, uDis, audits] =
    await Promise.all([
      soft(total({ status: 'pending' })),
      soft(total({ status: 'published' })),
      soft(total({ status: 'offline' })),
      soft(total({ status: 'rejected' })),
      soft(total({ status: 'draft' })),
      soft(cocktailApi.list({ status: 'pending', page: 1, pageSize: 5 })),
      soft(cocktailApi.list({ status: 'published', page: 1, pageSize: 6 })),
      soft(userApi.list({ page: 1, pageSize: 1 })),
      soft(userApi.list({ status: 'disabled', page: 1, pageSize: 1 })),
      soft(auditApi.list({ page: 1, pageSize: 50 })),
    ]);

  const data: LegacyDto = {};
  if (pending !== undefined) Object.assign(data, { pending, published, offline, rejected, draft });
  if (queue) data.pendingQueue = queue.items;
  if (hot?.items?.length) {
    data.hotCocktails = hot.items
      .filter((c) => !c.isPrivate)
      .map((c) => ({
        id: c.id, name: c.name, nameEn: c.nameEn, baseSpirit: c.baseSpirit, abv: c.abv,
        weeklyViews: c.weeklyViews ?? c.viewCount ?? c.views ?? null,
        likes: c.likes ?? c.likeCount ?? c.favorites ?? null,
        owner: c.owner ?? null,
      }));
    // 后端有热度字段则按热度排序;没有就保持服务端顺序兜底展示
    if (data.hotCocktails.some((c: LegacyDto) => c.weeklyViews != null)) {
      data.hotCocktails.sort((a: LegacyDto, b: LegacyDto) => (b.weeklyViews || 0) - (a.weeklyViews || 0));
    }
  }
  if (uAll) {
    data.userTotal = uAll.total;
    data.userDisabled = uDis?.total ?? 0;
  }
  if (audits) {
    data.recentAudits = audits.items.slice(0, 6);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    data.reviewedToday = audits.items.filter((l) =>
      /cocktail\.(approve|reject)$/.test(l.action || '') && new Date(l.createdAt) >= today).length;
  }
  return data;
}

export const dashboardApi = {
  /** GET /admin/dashboard(可选接口;缺失时前端拼装) */
  async overview() {
    try {
      const raw = await request.get('/admin/dashboard');
      if (raw && typeof raw === 'object') {
        return {
          ...raw,
          pendingQueue: raw.pendingQueue ? asArr(raw.pendingQueue) : raw.pendingQueue,
          hotCocktails: raw.hotCocktails ? asArr(raw.hotCocktails) : raw.hotCocktails,
          recentAudits: raw.recentAudits ? asArr(raw.recentAudits) : raw.recentAudits,
        };
      }
    } catch (caught) { const e = apiError(caught);
      if (![404, 405, 501].includes(e.status ?? 0)) throw e;
    }
    return compose();
  },
};
