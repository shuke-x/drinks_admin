// ------------------------------------------------------------------
// Mock 服务端。实现设计文档第 3、4 节的业务规则:
//   - 401 未认证 / 403 无权限;禁用账号即时失效
//   - 酒单状态机 draft/pending/rejected/published/offline
//   - 审核动作写 cocktail_review_logs,后台写操作写 admin_audit_logs
//   - 越权保护:最后一个 super_admin、不可操作高于自身的角色、不可禁用自己
// 所有函数签名与 client.js 中的 REST 路径一一对应,便于替换为真实 HTTP。
// ------------------------------------------------------------------

import { db, uid } from './db';

const now = () => new Date().toISOString();
const sleep = () => new Promise((r) => setTimeout(r, 220 + Math.random() * 260));

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const err = (status, message) => { throw new ApiError(status, message); };

// ----------------------------- token -----------------------------

const signToken = (userId) => btoa(`${userId}::${Date.now()}`);
const parseToken = (token) => {
  try { return atob(token).split('::')[0] || null; } catch { return null; }
};

// --------------------------- RBAC 基础 ---------------------------

const rolesOf = (userId) =>
  db.userRoles.filter((ur) => ur.userId === userId)
    .map((ur) => db.roles.find((r) => r.id === ur.roleId))
    .filter(Boolean);

const permsOf = (userId) => {
  const set = new Set();
  for (const role of rolesOf(userId)) {
    db.rolePermissions.filter((rp) => rp.roleId === role.id)
      .forEach((rp) => set.add(rp.permissionId));
  }
  return [...set];
};

const RANK = { super_admin: 3, operator: 2, reviewer: 2, user: 1 };
const rankOf = (userId) =>
  Math.max(1, ...rolesOf(userId).map((r) => RANK[r.code] ?? 1));

const enabledSuperAdminCount = () =>
  db.users.filter((u) => u.status === 'active' &&
    rolesOf(u.id).some((r) => r.code === 'super_admin')).length;

/** 认证:token -> user;禁用账号即时拒绝(对应验收清单第 4 条) */
const auth = (token) => {
  const id = token && parseToken(token);
  const user = id && db.users.find((u) => u.id === id);
  if (!user) err(401, '未登录或登录已过期,请重新登录');
  if (user.status === 'disabled') err(403, '账号已被禁用,如有疑问请联系超级管理员');
  return user;
};

/** 权限守卫:401 已在 auth 处理,此处只负责 403 */
const requirePerms = (user, ...codes) => {
  const owned = permsOf(user.id);
  for (const code of codes) {
    if (!owned.includes(code)) err(403, `没有执行该操作的权限(缺少 ${code})`);
  }
};

// --------------------------- 日志写入 ----------------------------

const audit = (actor, action, targetType, targetId, before, after) => {
  db.adminAuditLogs.unshift({
    id: uid('al'), actorId: actor.id, action, targetType, targetId,
    before: before ?? null, after: after ?? null,
    requestId: uid('req'), ip: '127.0.0.1',
    userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent.slice(0, 80) : 'BackbarAdmin/1.0',
    createdAt: now(),
  });
};

const reviewLog = (cocktailId, action, fromStatus, toStatus, reviewerId, reason) => {
  db.cocktailReviewLogs.unshift({
    id: uid('rl'), cocktailId, action, fromStatus, toStatus,
    reviewerId, reason: reason ?? null, createdAt: now(),
  });
};

// --------------------------- 序列化 ------------------------------

const userBrief = (id) => {
  const u = db.users.find((x) => x.id === id);
  return u ? { id: u.id, nickname: u.nickname, email: u.email, status: u.status } : null;
};

const roleView = (role) => ({
  ...role,
  permissionIds: db.rolePermissions.filter((rp) => rp.roleId === role.id).map((rp) => rp.permissionId),
  memberCount: db.userRoles.filter((ur) => ur.roleId === role.id).length,
});

const userView = (u) => ({
  id: u.id, email: u.email, nickname: u.nickname, status: u.status,
  disabledAt: u.disabledAt, disabledReason: u.disabledReason, createdAt: u.createdAt,
  roles: rolesOf(u.id).map((r) => ({ id: r.id, code: r.code, name: r.name })),
  cocktailCount: db.cocktails.filter((c) => c.ownerId === u.id && !c.deletedAt).length,
});

const cocktailListView = (c) => ({
  id: c.id, name: c.name, nameEn: c.nameEn, baseSpirit: c.baseSpirit,
  status: c.status, isPrivate: c.isPrivate, tags: c.tags,
  owner: userBrief(c.ownerId),
  submittedAt: c.submittedAt, publishedAt: c.publishedAt,
  createdAt: c.createdAt, updatedAt: c.updatedAt,
});

const paginate = (rows, page = 1, pageSize = 10) => {
  const size = Math.min(Math.max(1, Number(pageSize) || 10), 50); // 最大 limit 白名单
  const p = Math.max(1, Number(page) || 1);
  return { items: rows.slice((p - 1) * size, p * size), total: rows.length, page: p, pageSize: size };
};

// ==================================================================
//                              接口实现
// ==================================================================

// POST /auth/login
export async function login({ email, password }) {
  await sleep();
  const account = db.accounts[(email || '').trim().toLowerCase()];
  if (!account || account.password !== password) err(401, '邮箱或密码不正确');
  const user = db.users.find((u) => u.id === account.userId);
  if (user.status === 'disabled') err(403, '账号已被禁用,无法登录');
  const perms = permsOf(user.id);
  if (perms.length === 0) err(403, '该账号没有任何后台权限,无法进入管理端');
  return { token: signToken(user.id), user: userView(user), permissions: perms };
}

// GET /auth/me
export async function getMe(token) {
  await sleep();
  const user = auth(token);
  return { user: userView(user), permissions: permsOf(user.id) };
}

// ------------------------------ 用户 -----------------------------

// GET /admin/users
export async function listUsers(token, { page, pageSize, status, keyword } = {}) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'users.read');
  let rows = [...db.users];
  if (status) rows = rows.filter((u) => u.status === status);
  if (keyword) {
    const k = keyword.trim().toLowerCase();
    rows = rows.filter((u) => u.email.toLowerCase().includes(k) || u.nickname.toLowerCase().includes(k));
  }
  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const pg = paginate(rows, page, pageSize);
  return { ...pg, items: pg.items.map(userView) };
}

// GET /admin/users/:id
export async function getUser(token, id) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'users.read');
  const user = db.users.find((u) => u.id === id) || err(404, '用户不存在');
  const owned = db.cocktails.filter((c) => c.ownerId === id && !c.deletedAt);
  const stat = (s) => owned.filter((c) => c.status === s).length;
  return {
    user: userView(user),
    stats: { total: owned.length, published: stat('published'), pending: stat('pending'), rejected: stat('rejected'), offline: stat('offline'), draft: stat('draft') },
    recentCocktails: owned
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 5).map(cocktailListView),
  };
}

/** 越权保护:目标角色等级高于操作者时禁止操作 */
const guardRank = (actor, target) => {
  if (rankOf(target.id) > rankOf(actor.id)) err(403, '不能操作角色等级高于自己的用户');
};

// PATCH /admin/users/:id/status
export async function updateUserStatus(token, id, { status, reason } = {}) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'users.update_status');
  const target = db.users.find((u) => u.id === id) || err(404, '用户不存在');
  if (!['active', 'disabled'].includes(status)) err(400, '非法的状态值');
  if (target.status === status) err(400, '用户已处于该状态');
  guardRank(actor, target);

  if (status === 'disabled') {
    if (target.id === actor.id) err(400, '不能禁用自己的账号');
    if (!reason || reason.trim().length < 2) err(400, '禁用用户必须填写原因');
    const isSuper = rolesOf(target.id).some((r) => r.code === 'super_admin');
    if (isSuper && enabledSuperAdminCount() <= 1) err(400, '系统必须保留至少一名启用状态的超级管理员');
  }

  const before = { status: target.status, disabledReason: target.disabledReason };
  target.status = status;
  target.disabledAt = status === 'disabled' ? now() : null;
  target.disabledReason = status === 'disabled' ? reason.trim() : null;
  audit(actor, status === 'disabled' ? 'user.disable' : 'user.enable', 'user', target.id,
    before, { status: target.status, disabledReason: target.disabledReason });
  return { user: userView(target) };
}

// PUT /admin/users/:id/roles
export async function setUserRoles(token, id, { roleIds } = {}) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'users.assign_roles');
  const target = db.users.find((u) => u.id === id) || err(404, '用户不存在');
  if (!Array.isArray(roleIds)) err(400, 'roleIds 必须是数组');
  const nextRoles = roleIds.map((rid) => db.roles.find((r) => r.id === rid) || err(400, `角色 ${rid} 不存在`));
  guardRank(actor, target);

  const wasSuper = rolesOf(target.id).some((r) => r.code === 'super_admin');
  const willBeSuper = nextRoles.some((r) => r.code === 'super_admin');
  if (wasSuper && !willBeSuper && target.status === 'active' && enabledSuperAdminCount() <= 1) {
    err(400, '不能移除最后一名启用状态超级管理员的 super_admin 角色');
  }

  const before = { roles: rolesOf(target.id).map((r) => r.code) };
  db.userRoles = db.userRoles.filter((ur) => ur.userId !== target.id);
  nextRoles.forEach((r) => db.userRoles.push({ userId: target.id, roleId: r.id, assignedBy: actor.id, createdAt: now() }));
  audit(actor, 'user.assign_roles', 'user', target.id, before, { roles: nextRoles.map((r) => r.code) });
  return { user: userView(target) };
}

// ------------------------------ 酒单 -----------------------------

const findCocktail = (id) => {
  const c = db.cocktails.find((x) => x.id === id && !x.deletedAt);
  return c || err(404, '酒单不存在或已被删除');
};

// GET /admin/cocktails
export async function listCocktails(token, { page, pageSize, status, baseSpirit, ownerId, keyword } = {}) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'cocktails.read');
  let rows = db.cocktails.filter((c) => !c.deletedAt);
  if (status) rows = rows.filter((c) => c.status === status);
  if (baseSpirit) rows = rows.filter((c) => c.baseSpirit === baseSpirit);
  if (ownerId) rows = rows.filter((c) => c.ownerId === ownerId);
  if (keyword) {
    const k = keyword.trim().toLowerCase();
    rows = rows.filter((c) => c.name.toLowerCase().includes(k) || (c.nameEn || '').toLowerCase().includes(k));
  }
  // 排序白名单:待审在前按提交时间升序(先到先审),其余按更新时间倒序
  rows = [...rows].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    if (a.status === 'pending' && b.status === 'pending') return a.submittedAt < b.submittedAt ? -1 : 1;
    return a.updatedAt < b.updatedAt ? 1 : -1;
  });
  const pg = paginate(rows, page, pageSize);
  return { ...pg, items: pg.items.map(cocktailListView) };
}

// GET /admin/cocktails/:id
export async function getCocktail(token, id) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'cocktails.read');
  const c = findCocktail(id);
  return {
    cocktail: { ...c, owner: userBrief(c.ownerId), reviewer: userBrief(c.reviewerId) },
    reviewLogs: db.cocktailReviewLogs
      .filter((l) => l.cocktailId === id)
      .map((l) => ({ ...l, reviewer: userBrief(l.reviewerId) })),
  };
}

/** 状态机:action -> { 允许的来源状态, 目标状态 }(文档 3.1 节) */
const TRANSITIONS = {
  approve: { from: ['pending'], to: 'published' },
  reject: { from: ['pending'], to: 'rejected' },
  offline: { from: ['published'], to: 'offline' },
  publish: { from: ['offline'], to: 'published' },
};

const transition = (actor, cocktail, action, reason) => {
  const t = TRANSITIONS[action];
  if (!t.from.includes(cocktail.status)) {
    err(409, `当前状态为「${cocktail.status}」,不允许执行该操作(仅 ${t.from.join('/')} 可以)`);
  }
  const from = cocktail.status;
  const at = now();
  cocktail.status = t.to;
  cocktail.updatedAt = at;
  if (action === 'approve') {
    Object.assign(cocktail, { reviewedAt: at, reviewerId: actor.id, publishedAt: at, rejectReason: null, offlineReason: null });
  } else if (action === 'reject') {
    Object.assign(cocktail, { reviewedAt: at, reviewerId: actor.id, rejectReason: reason, publishedAt: null });
  } else if (action === 'offline') {
    cocktail.offlineReason = reason;
  } else if (action === 'publish') {
    Object.assign(cocktail, { publishedAt: at, offlineReason: null });
  }
  // 「事务」:状态、审核日志、审计日志一并写入
  reviewLog(cocktail.id, action, from, cocktail.status, actor.id, reason);
  audit(actor, `cocktail.${action}`, 'cocktail', cocktail.id,
    { status: from }, { status: cocktail.status, ...(reason ? { reason } : {}) });
};

// POST /admin/cocktails/:id/approve
export async function approveCocktail(token, id) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'cocktails.review');
  const c = findCocktail(id);
  transition(actor, c, 'approve');
  return { cocktail: { ...c } };
}

// POST /admin/cocktails/:id/reject   (原因必填)
export async function rejectCocktail(token, id, { reason } = {}) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'cocktails.review');
  if (!reason || reason.trim().length < 4) err(400, '驳回必须填写原因(不少于 4 个字),将展示给作者');
  const c = findCocktail(id);
  transition(actor, c, 'reject', reason.trim());
  return { cocktail: { ...c } };
}

// POST /admin/cocktails/:id/offline  (原因必填)
export async function offlineCocktail(token, id, { reason } = {}) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'cocktails.offline');
  if (!reason || reason.trim().length < 4) err(400, '下架必须填写原因(不少于 4 个字)');
  const c = findCocktail(id);
  transition(actor, c, 'offline', reason.trim());
  return { cocktail: { ...c } };
}

// POST /admin/cocktails/:id/publish  (offline -> published,需内容完整)
export async function publishCocktail(token, id) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'cocktails.publish');
  const c = findCocktail(id);
  if (c.isPrivate) err(400, '私密酒单不能上架');
  if (!c.name || !c.baseSpirit || !c.ingredients?.length || !c.steps?.length) {
    err(400, '内容不完整(缺少名称 / 基酒 / 配方 / 步骤),需作者补全后重新提交审核');
  }
  transition(actor, c, 'publish');
  return { cocktail: { ...c } };
}

// PATCH /admin/cocktails/:id  (运营修订,保留前后快照)
const EDITABLE_FIELDS = ['name', 'nameEn', 'baseSpirit', 'abv', 'description', 'tags', 'imageUrl'];
export async function updateCocktail(token, id, patch = {}) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'cocktails.update');
  const c = findCocktail(id);
  const before = {}; const after = {};
  for (const key of EDITABLE_FIELDS) {
    if (!(key in patch)) continue;
    const next = patch[key];
    if (key === 'name' && (!next || !String(next).trim())) err(400, '名称不能为空');
    if (JSON.stringify(c[key]) !== JSON.stringify(next)) {
      before[key] = c[key]; after[key] = next; c[key] = next;
    }
  }
  if (Object.keys(after).length === 0) err(400, '没有可保存的修改');
  c.updatedAt = now();
  audit(actor, 'cocktail.update', 'cocktail', c.id, before, after);
  return { cocktail: { ...c } };
}

// DELETE /admin/cocktails/:id  (软删除;审核 / 审计历史保留)
export async function deleteCocktail(token, id) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'cocktails.delete');
  const c = findCocktail(id);
  const before = { status: c.status };
  c.deletedAt = now();
  c.updatedAt = c.deletedAt;
  audit(actor, 'cocktail.delete', 'cocktail', c.id, before, { deletedAt: c.deletedAt });
  return { ok: true };
}

// ------------------------------ 角色 -----------------------------

// GET /admin/roles
export async function listRoles(token) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'roles.read');
  return {
    roles: db.roles.map(roleView),
    permissions: db.permissions,
  };
}

const ROLE_CODE_RE = /^[a-z][a-z0-9_]{2,29}$/;

// POST /admin/roles
export async function createRole(token, { code, name, description, permissionIds } = {}) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'roles.manage');
  if (!ROLE_CODE_RE.test(code || '')) err(400, '角色标识需为 3-30 位小写字母 / 数字 / 下划线,且以字母开头');
  if (db.roles.some((r) => r.code === code)) err(409, `角色标识 ${code} 已存在`);
  if (!name || !name.trim()) err(400, '角色名称不能为空');
  const ids = [...new Set(permissionIds || [])];
  ids.forEach((pid) => db.permissions.find((p) => p.id === pid) || err(400, `权限 ${pid} 不存在`));

  const role = { id: uid('r'), code, name: name.trim(), description: (description || '').trim(), isSystem: false, createdAt: now() };
  db.roles.push(role);
  ids.forEach((pid) => db.rolePermissions.push({ roleId: role.id, permissionId: pid }));
  audit(actor, 'role.create', 'role', role.id, null, { code, name: role.name, permissions: ids });
  return { role: roleView(role) };
}

// PATCH /admin/roles/:id
export async function updateRole(token, id, { name, description, permissionIds } = {}) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'roles.manage');
  const role = db.roles.find((r) => r.id === id) || err(404, '角色不存在');
  if (role.code === 'super_admin' && permissionIds) err(400, '超级管理员的权限集合固定为全部权限,不可修改');

  const before = { name: role.name, description: role.description, permissions: roleView(role).permissionIds };
  if (name !== undefined) {
    if (!name.trim()) err(400, '角色名称不能为空');
    role.name = name.trim();
  }
  if (description !== undefined) role.description = (description || '').trim();
  if (permissionIds) {
    const ids = [...new Set(permissionIds)];
    ids.forEach((pid) => db.permissions.find((p) => p.id === pid) || err(400, `权限 ${pid} 不存在`));
    db.rolePermissions = db.rolePermissions.filter((rp) => rp.roleId !== role.id);
    ids.forEach((pid) => db.rolePermissions.push({ roleId: role.id, permissionId: pid }));
  }
  audit(actor, 'role.update', 'role', role.id, before,
    { name: role.name, description: role.description, permissions: roleView(role).permissionIds });
  return { role: roleView(role) };
}

// ---------------------------- 审计日志 ---------------------------

// GET /admin/audit-logs
export async function listAuditLogs(token, { page, pageSize, targetType, action, actorId } = {}) {
  await sleep();
  const actor = auth(token);
  requirePerms(actor, 'audit_logs.read');
  let rows = [...db.adminAuditLogs];
  if (targetType) rows = rows.filter((l) => l.targetType === targetType);
  if (action) rows = rows.filter((l) => l.action.includes(action.trim()));
  if (actorId) rows = rows.filter((l) => l.actorId === actorId);
  const pg = paginate(rows, page, pageSize);
  return { ...pg, items: pg.items.map((l) => ({ ...l, actor: userBrief(l.actorId) })) };
}

// --------------------------- 工作台统计 --------------------------
// (扩展接口,文档未定义;真实项目可由 GET /admin/dashboard 提供)

export async function getDashboard(token) {
  await sleep();
  const actor = auth(token);
  const perms = permsOf(actor.id);
  const alive = db.cocktails.filter((c) => !c.deletedAt);
  const count = (s) => alive.filter((c) => c.status === s).length;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const reviewedToday = db.cocktailReviewLogs.filter(
    (l) => ['approve', 'reject'].includes(l.action) && new Date(l.createdAt) >= today,
  ).length;

  const data = { reviewedToday };
  if (perms.includes('cocktails.read')) {
    Object.assign(data, {
      pending: count('pending'), published: count('published'),
      offline: count('offline'), rejected: count('rejected'), draft: count('draft'),
      pendingQueue: alive.filter((c) => c.status === 'pending')
        .sort((a, b) => (a.submittedAt < b.submittedAt ? -1 : 1))
        .slice(0, 5).map(cocktailListView),
      // 最近热门:仅公开且已上架的内容,按本周浏览量排序(客户端读取路径同源)
      hotCocktails: alive.filter((c) => c.status === 'published' && !c.isPrivate)
        .sort((a, b) => (b.weeklyViews || 0) - (a.weeklyViews || 0))
        .slice(0, 6)
        .map((c) => ({
          id: c.id, name: c.name, nameEn: c.nameEn, baseSpirit: c.baseSpirit, abv: c.abv,
          weeklyViews: c.weeklyViews || 0, likes: c.likes || 0,
          imageUrl: c.imageUrl, owner: userBrief(c.ownerId),
        })),
    });
  }
  if (perms.includes('users.read')) {
    data.userTotal = db.users.length;
    data.userDisabled = db.users.filter((u) => u.status === 'disabled').length;
  }
  if (perms.includes('audit_logs.read')) {
    data.recentAudits = db.adminAuditLogs.slice(0, 6).map((l) => ({ ...l, actor: userBrief(l.actorId) }));
  }
  return data;
}
