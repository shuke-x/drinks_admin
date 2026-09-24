import { request } from '../request';
import type { LegacyDto } from '../types';

export const categoryApi = {
  /** 客户端公开分类接口，仅返回启用中的基酒分类，不需要 Token。 */
  publicList: () => request.get('/cocktail-categories'),
  /** Admin 分类管理接口，包含已停用分类。 */
  list: () => request.get('/admin/cocktail-categories'),
  create: (body: LegacyDto) => request.post('/admin/cocktail-categories', body),
  update: (id: string, body: LegacyDto) => request.patch(`/admin/cocktail-categories/${id}`, body),
  remove: (id: string) => request.delete(`/admin/cocktail-categories/${id}`),
};
