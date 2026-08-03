# RBAC 权限模块与新增功能接入

## 1. 设计边界

| 层 | 负责人 | 职责 |
| --- | --- | --- |
| API Route 策略 | 后端开发 | 用 `@RequirePermissions("resource.action")` 声明接口需要什么权限 |
| 权限目录与角色授权 | Super 管理员 | 在管理端创建权限，并把权限分配给角色 |
| 页面入口控制 | 前端 | 根据 `/auth/me` 返回的有效权限隐藏菜单、按钮并拦截页面直达 |

后端不在启动时维护或写入一份硬编码权限目录。`@RequirePermissions(...)` 也不会写数据库；它只是 API 的安全规则。数据库中的权限记录由 Super 动态创建。

前端隐藏入口只改善体验，不能替代后端 Guard。任何受保护接口都必须由后端再次鉴权。

## 2. 权限码规范

权限码采用 `resource.action`，例如 `cocktails.read`、`categories.manage`、`recommendations.manage`。

- 仅使用小写字母、数字和下划线，至少包含一个 `.`。
- 权限码创建后不可修改，展示名称可以独立演进。
- 按业务能力设计，不按 URL 数量设计。列表和详情通常可以共用一个 `read` 权限。

## 3. 动态创建与授权流程

新增受保护能力时按以下顺序操作：

1. 后端在对应 Controller 上绑定权限码。
2. 如果功能包含新表或字段，先发布并执行数据库 migration。
3. Super 登录管理端，进入“角色与权限”，点击“新增权限”。
4. 输入权限码和名称；前端调用 `POST /api/v1/admin/permissions`。
5. 后端创建权限记录，并自动将它授予 `super_admin`。
6. Super 编辑其他角色，按需勾选新权限并保存。
7. 前端菜单、页面和按钮使用同一个权限码。
8. 创建者的管理端会立即重新请求 `/auth/me`；其他已登录用户需刷新会话或重新登录。

权限创建接口由已有的 `roles.manage` 保护，因此新权限尚不存在时，Super 仍可从角色管理页完成注册。

## 4. API 契约

### 创建权限

```http
POST /api/v1/admin/permissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "recommendations.manage",
  "name": "管理今日推荐"
}
```

要求调用者拥有 `roles.manage`。权限码重复返回 `409`，格式错误返回 `400`。成功后，后端同时创建 `super_admin` 的授权关系，并写入 `permissions.create` 审计日志。

### 获取权限目录

```http
GET /api/v1/admin/roles
```

响应包含 `roles` 和 `permissions`。角色编辑器只能提交后端返回的权限 ID，不能自行构造未知权限。

### 分配角色权限

```http
PATCH /api/v1/admin/roles/:roleId
Content-Type: application/json

{
  "permissionIds": ["<permission uuid>"]
}
```

`super_admin` 的权限集合不允许手工编辑；新权限创建时由后端自动补齐。其他角色由 Super 显式授权。

## 5. 每日推荐示例

后端路由策略：

```ts
@Controller("admin/daily-recommendations")
@RequirePermissions("recommendations.manage")
export class AdminDailyRecommendationsController {}
```

前端路由和菜单使用同一个权限码：

```tsx
<RequirePerm perm="recommendations.manage">
  <DailyRecommendations />
</RequirePerm>
```

发布顺序：

1. 执行 `1820000000000-AddDailyRecommendations` migration，创建业务表。
2. 在管理端新增 `recommendations.manage / 管理今日推荐`。
3. 编辑 `operator` 等角色并按需授权。
4. 重新登录，确认 `/auth/me` 包含 `recommendations.manage`。

## 6. 代码位置

后端 `drinks_server`：

- `src/modules/admin/admin.controller.ts`：动态权限创建接口。
- `src/modules/admin/admin.service.ts`：创建权限、自动授权 Super、审计。
- `src/modules/admin/guards/permissions.guard.ts`：API 权限校验。
- `src/modules/admin/decorators/require-permissions.decorator.ts`：路由权限声明。
- `migrations/`：负责数据库结构演进，不注册新业务权限。

前端 `backbar-admin`：

- `src/pages/Roles.tsx`：新增权限及角色授权界面。
- `src/api/modules/role.ts`：权限与角色 API。
- `src/components/ui/usePermission.ts`：权限判断。
- `src/layout/guards.tsx`：页面直达拦截。

## 7. 排查清单

菜单没有出现时依次检查：

1. `dist` 是否包含页面路由。
2. `GET /auth/me` 是否返回所需权限码。
3. `GET /admin/roles` 的 `permissions` 中是否存在该权限。
4. 当前用户角色是否包含该权限 ID。
5. 后端接口是否绑定了完全相同的权限码。
6. 新业务表对应 migration 是否已经执行。

直接访问页面跳转 `/403`，通常表示 `/auth/me` 缺少权限；接口返回 `403`，表示后端 Guard 未找到有效授权；接口返回数据库表不存在，则是 migration 未执行，与权限目录无关。
