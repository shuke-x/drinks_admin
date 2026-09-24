/**
 * 前端权限契约。
 * 后端仍是权限目录和鉴权结果的权威来源；这里统一路由与操作入口
 * 使用的权限码，避免同一个前端能力在多处出现拼写差异。
 */
export const PERMISSION = {
  RECORDS_REVIEW: 'records.review',
  FLAVORS_MANAGE: 'flavors.manage',
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
  records: '品饮记录',
  flavors: '风味配置',
  users: '用户',
  cocktails: '酒单',
  categories: '酒单分类',
  recommendations: '今日推荐',
  imports: '数据导入',
  roles: '权限系统',
  audit_logs: '日志',
};
