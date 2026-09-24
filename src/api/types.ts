/** Transitional boundary for legacy server fields; new DTOs should use concrete interfaces. */
export type LegacyDto = Record<string, any>;
export interface ApiError { status?: number; code?: string; message: string; silent?: boolean }
export function apiError(error: unknown): ApiError {
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>;
    return { message: typeof value.message === 'string' ? value.message : '操作失败', status: typeof value.status === 'number' ? value.status : undefined, code: typeof value.code === 'string' ? value.code : undefined };
  }
  return { message: typeof error === 'string' ? error : '操作失败' };
}
export interface LoginDto { email: string; password: string }
export interface RoleDto { id: string; code: string; name: string; description?: string; permissionIds: string[]; isSystem: boolean; memberCount: number }
export interface PermissionDto { id: string; code: string; name: string; group: string }
export interface RoleInput { code?: string; name: string; description?: string; permissionIds?: string[] }
export interface UserDto extends LegacyDto { id: string; nickname: string; accountSource: string; roles: RoleDto[] }
export interface SessionDto { token: string | null; user: UserDto; permissions: string[] }
export interface PageDto<T> { items: T[]; total: number; page: number; pageSize: number }
