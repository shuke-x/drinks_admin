// ------------------------------------------------------------------
// DTO 归一化:把后端返回统一成页面消费的视图形状。
// 后端字段与文档一致时等价于透传;有出入优先在这里消化,
// 页面与 Redux 不感知差异。
// ------------------------------------------------------------------

export const asArr = (v) => (Array.isArray(v) ? v : []);

export const normPerm = (p) => (typeof p === 'string' ? p : (p?.code ?? p?.id ?? ''));

export const normRole = (r) => (typeof r === 'string'
  ? { id: r, code: r, name: r }
  : { ...r, id: r.id ?? r.code, code: r.code ?? r.id, name: r.name ?? r.code });

export const normUser = (u = {}) => ({
  ...u,
  nickname: u.nickname ?? u.name ?? u.email ?? '',
  roles: asArr(u.roles).map(normRole),
});

/** 登录 / me:兼容 token|accessToken|access_token、user 平铺或嵌套、permissions 字符串或对象 */
export const normSession = (raw = {}) => {
  const userSrc = raw.user ?? raw.profile ?? raw;
  const user = normUser(userSrc);
  const permissions = asArr(raw.permissions ?? userSrc?.permissions).map(normPerm).filter(Boolean);
  const token = raw.token ?? raw.accessToken ?? raw.access_token ?? raw.jwt ?? null;
  return { token, user, permissions };
};

/** 分页列表:兼容 items | list | records | rows | 裸数组 与 total | count | totalCount */
export const normList = (raw, page, pageSize) => {
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

export const normCocktail = (c = {}) => {
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

export const normRoleFull = (r = {}) => ({
  isSystem: false, memberCount: r.memberCount ?? r.userCount ?? 0,
  ...r,
  permissionIds: asArr(r.permissionIds ?? r.permissions).map((p) => (typeof p === 'string' ? p : (p.id ?? p.code))),
});

export const normPermFull = (p) => (typeof p === 'string'
  ? { id: p, code: p, name: p, group: p.split('.')[0] }
  : { ...p, id: p.id ?? p.code, code: p.code ?? p.id, group: p.group ?? (p.code ?? p.id ?? '').split('.')[0] });
