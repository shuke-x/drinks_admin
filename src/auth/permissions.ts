/**
 * 前端权限契约。
 * 后端仍是权限目录和鉴权结果的权威来源；这里统一路由、操作入口与 Mock
 * 使用的权限码，避免同一个前端能力在多处出现拼写差异。
 */
export const PERMISSION = {
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_DELETE: 'users.delete',
  USERS_UPDATE_STATUS: 'users.update_status',
  USERS_ASSIGN_ROLES: 'users.assign_roles',
  COCKTAILS_READ: 'cocktails.read',
  COCKTAILS_UPDATE: 'cocktails.update',
  COCKTAILS_DELETE: 'cocktails.delete',
  COCKTAILS_PUBLISH: 'cocktails.publish',
  COCKTAILS_OFFLINE: 'cocktails.offline',
  COCKTAILS_REVIEW: 'cocktails.review',
  ROLES_READ: 'roles.read',
  ROLES_MANAGE: 'roles.manage',
  AUDIT_LOGS_READ: 'audit_logs.read',
  IMPORTS_MANAGE: 'imports.manage',
  CATEGORIES_MANAGE: 'categories.manage',
  RECOMMENDATIONS_MANAGE: 'recommendations.manage',
} as const;

export type PermissionCode = typeof PERMISSION[keyof typeof PERMISSION];

export const PERMISSION_GROUPS: Record<string, string> = {
  users: '用户',
  cocktails: '酒单',
  categories: '酒单分类',
  recommendations: '今日推荐',
  imports: '数据导入',
  roles: '权限系统',
  audit_logs: '日志',
};

const definePermission = (code: PermissionCode, name: string) => ({
  id: code,
  code,
  name,
  group: code.split('.')[0],
});

/** 仅用于离线 Mock 的初始数据，不会在真实环境向后端注册权限。 */
export const MOCK_PERMISSION_CATALOG = [
  definePermission(PERMISSION.USERS_READ, '查看用户'),
  definePermission(PERMISSION.USERS_CREATE, '新增用户'),
  definePermission(PERMISSION.USERS_DELETE, '删除用户'),
  definePermission(PERMISSION.USERS_UPDATE_STATUS, '启用 / 禁用用户'),
  definePermission(PERMISSION.USERS_ASSIGN_ROLES, '分配角色'),
  definePermission(PERMISSION.COCKTAILS_READ, '查看酒单'),
  definePermission(PERMISSION.COCKTAILS_UPDATE, '编辑酒单'),
  definePermission(PERMISSION.COCKTAILS_DELETE, '删除酒单'),
  definePermission(PERMISSION.COCKTAILS_PUBLISH, '重新上架'),
  definePermission(PERMISSION.COCKTAILS_OFFLINE, '下架酒单'),
  definePermission(PERMISSION.COCKTAILS_REVIEW, '审核酒单（通过 / 驳回）'),
  definePermission(PERMISSION.ROLES_READ, '查看角色'),
  definePermission(PERMISSION.ROLES_MANAGE, '管理角色'),
  definePermission(PERMISSION.AUDIT_LOGS_READ, '查看审计日志'),
  definePermission(PERMISSION.IMPORTS_MANAGE, '导入酒单数据'),
  definePermission(PERMISSION.CATEGORIES_MANAGE, '管理酒单分类'),
  definePermission(PERMISSION.RECOMMENDATIONS_MANAGE, '管理今日推荐'),
] as const;
