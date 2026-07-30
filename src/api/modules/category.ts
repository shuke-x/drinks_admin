import { request } from '../request';

export const categoryApi = {
  /** Admin 分类管理接口，包含已停用分类。 */
  list: () => request.get('/admin/cocktail-categories'),
  create: (body) => request.post('/admin/cocktail-categories', body),
  update: (id, body) => request.patch(`/admin/cocktail-categories/${id}`, body),
  remove: (id) => request.delete(`/admin/cocktail-categories/${id}`),
};
