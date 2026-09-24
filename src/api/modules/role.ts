import type { LegacyDto } from '../types';
// ------------------------------------------------------------------
// 角色与权限模块(文档 4.3 · /admin/roles)
// ------------------------------------------------------------------
import { asArr,normPermFull,normRoleFull } from '../normalize';
import { request } from '../request';

export const roleApi = {
  /** GET /admin/roles —— 角色列表 + 全量权限表 */
  async list() {
    const raw = await request.get('/admin/roles') || {};
    return {
      roles: asArr(raw.roles ?? raw.items ?? (Array.isArray(raw) ? raw : [])).map(normRoleFull),
      permissions: asArr(raw.permissions).map(normPermFull),
    };
  },

  /** POST /admin/roles —— { code, name: string, description?, permissionIds? } */
  create: (body: LegacyDto) => request.post('/admin/roles', body),

  /** POST /admin/permissions —— Super 创建权限并自动获得该权限 */
  createPermission: (body: LegacyDto) => request.post('/admin/permissions', body),

  /** PATCH /admin/roles/:id —— 系统角色 code 不可改;super_admin 权限集合锁定 */
  update: (id: string, body: LegacyDto) => request.patch(`/admin/roles/${id}`, body),
};
