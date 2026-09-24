// ------------------------------------------------------------------
// DTO 归一化:把后端返回统一成页面消费的视图形状。
// 后端字段与文档一致时等价于透传;有出入优先在这里消化,
// 页面与 Redux 不感知差异。
// ------------------------------------------------------------------

import type { LegacyDto,PermissionDto,RoleDto,SessionDto,UserDto } from './types';
export const asArr = (v: unknown): LegacyDto[] => (Array.isArray(v) ? v : []);

export const normPerm = (p: string | LegacyDto): string => (typeof p === 'string' ? p : (p?.code ?? p?.id ?? ''));

export const normRole = (r: string | LegacyDto): RoleDto => (typeof r === 'string'
  ? { id: r, code: r, name: r, permissionIds: [], isSystem: false, memberCount: 0 }
  : { ...r, id: r.id ?? r.code, code: r.code ?? r.id, name: r.name ?? r.code, permissionIds: r.permissionIds ?? [], isSystem: r.isSystem ?? false, memberCount: r.memberCount ?? 0 });

export const normUser = (u: LegacyDto = {}): UserDto => {
  const profile = { ...u };
  for (const key of ['token', 'accessToken', 'access_token', 'jwt', 'refreshToken', 'refresh_token']) delete profile[key];
  return {
  ...profile,
  id: u.id ?? '',
  nickname: u.nickname ?? u.name ?? u.email ?? '',
  accountSource: u.accountSource ?? 'app',
  roles: asArr(u.roles).map(normRole),
  };
};

/** 登录 / me:兼容 token|accessToken|access_token、user 平铺或嵌套、permissions 字符串或对象 */
export const normSession = (raw: LegacyDto = {}): SessionDto => {
  const userSrc = raw.user ?? raw.profile ?? raw;
  const user = normUser(userSrc);
  const permissions = asArr(raw.permissions ?? userSrc?.permissions).map(normPerm).filter(Boolean);
  const token = raw.token ?? raw.accessToken ?? raw.access_token ?? raw.jwt ?? null;
  return { token, user, permissions };
};

/** 分页列表:兼容 items | list | records | rows | 裸数组 与 total | count | totalCount */
export const normList = (raw: any, page?: number, pageSize?: number): import('./types').PageDto<LegacyDto> => {
  if (Array.isArray(raw)) return { items: raw, total: raw.length, page: page || 1, pageSize: pageSize || raw.length };
  const o = raw || {};
  const items = asArr(o.items ?? o.list ?? o.records ?? o.rows);
  return {
    items,
    total: o.total ?? o.count ?? o.totalCount ?? items.length,
    page: o.page ?? page ?? 1,
    pageSize: o.pageSize ?? o.limit ?? o.size ?? pageSize ?? items.length,
  };
};

export const EMPTY_STATS = { total: 0, published: 0, pending: 0, rejected: 0, offline: 0, draft: 0 };

export const normCocktail = (c: LegacyDto = {}): LegacyDto => {
  const recipe = asArr(c.ingredients ?? c.recipe).map((item) => ({
    ...item,
    name: item.name ?? item.n ?? '',
    amount: item.amount ?? (item.ml != null ? `${item.ml} ml` : item.t ?? ''),
  }));
  return {
    ...c,
    name: c.name ?? c.zh ?? '',
    nameEn: c.nameEn ?? c.en ?? '',
    baseSpirit: c.baseSpirit ?? c.spirit ?? c.category?.code ?? '',
    description: c.description ?? c.story ?? c.flavor ?? '',
    imageUrl: c.imageUrl ?? asArr(c.images)[0] ?? '',
    owner: c.owner ? normUser(c.owner) : null,
    reviewer: c.reviewer ? normUser(c.reviewer) : null,
    tags: asArr(c.tags),
    ingredients: recipe,
    steps: asArr(c.steps),
  };
};

export const normRoleFull = (r: LegacyDto = {}): RoleDto => ({
  id: r.id ?? r.code, code: r.code ?? r.id, name: r.name ?? r.code,
  isSystem: false, memberCount: r.memberCount ?? r.userCount ?? 0,
  ...r,
  permissionIds: asArr(r.permissionIds ?? r.permissions).map((p) => (typeof p === 'string' ? p : (p.id ?? p.code))),
});

export const normPermFull = (p: string | LegacyDto): PermissionDto => (typeof p === 'string'
  ? { id: p, code: p, name: p, group: p.split('.')[0] }
  : { ...p, name: p.name ?? p.code ?? p.id, id: p.id ?? p.code, code: p.code ?? p.id, group: p.group ?? (p.code ?? p.id ?? '').split('.')[0] });
