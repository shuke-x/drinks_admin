# Backbar · 酒单后台管理系统

基于《后台管理、RBAC 与酒单审核设计》文档实现的后台前端。**默认直连真实后端**:所有请求按文档 4.3 节的 REST 路径发出(`/api/v1/auth/*`、`/api/v1/admin/*`),开发环境经 Vite 代理转发。仓库内另保留一套内置 Mock,仅当 `VITE_USE_MOCK=1` 时启用,供后端不可用时离线演示(生产构建中会被完整 tree-shake 掉)。

技术栈:**React 18 + Redux Toolkit + React Router 6 + Vite 5**,以及 react-bits 风格动效组件(SplitText / CountUp / SpotlightCard / Aurora / FadeContent / ShinyText / ImageTrail 的零依赖本地实现,见 `src/components/react-bits/`;reactbits.dev 的组件本身即以"复制进项目"方式分发)。

## 快速开始(连接现有后端)

```bash
npm install
cp .env.example .env   # 按需修改后端地址
npm run dev            # http://localhost:5173
```

三个环境变量(均可省略,括号内为默认值):`VITE_PROXY_TARGET` 开发代理指向的后端(`http://localhost:3000`);`VITE_API_BASE` 请求前缀(`/api/v1`);`VITE_USE_MOCK` 设为 `1` 时启用内置 Mock。登录账号使用后端数据库中的真实账号。

### 后端契约

- **认证**:`POST /auth/login`(`{ email, password }`)与 `GET /auth/me`,携带 `Authorization: Bearer <token>`。登录响应兼容 `token / accessToken / access_token` 字段;若响应不含用户与权限,会自动补一次 `/auth/me`。
- **响应风格**:裸 JSON 或 `{ code, data, message }` 包装均可,分页字段兼容 `items | list | records | rows` 与 `total | count | totalCount`;角色 / 权限可以是字符串数组或对象数组(见 `src/api/real.js` 的 normalize 层)。
- **错误约定**:`401` 自动登出;`403` 弹出无权限提示;`400 / 409` 的 `message` 直接透出为 Toast(NestJS 默认异常体与 class-validator 的数组 message 均可解析)。
- **工作台聚合**:优先请求 `GET /admin/dashboard`;后端未实现(404/405/501)时,前端自动用标准接口拼装统计卡、待审队列、热门榜与最近操作,某模块无权限(403)则静默省略该模块。热门榜会识别 `weeklyViews / viewCount / views` 与 `likes / likeCount / favorites` 等热度字段别名。

### 离线演示(可选)

`.env` 中设 `VITE_USE_MOCK=1` 即切回内存 Mock(无需后端,刷新重置)。此模式登录页提供三个可一键填充的演示账号:admin@bar.dev / admin123(超管)、operator@bar.dev / operator123(运营)、reviewer@bar.dev / reviewer123(审核员)。

## 功能 ↔ 设计文档映射

| 文档章节 | 实现位置 |
| --- | --- |
| 3.1 酒单状态机(draft/pending/rejected/published/offline、`isPrivate` 不参与发布) | `mockServer.js` 的 `TRANSITIONS` + 详情页「状态轨道」组件 |
| 3.2 RBAC(权限码 `resource.action`、四个预置角色、最小权限) | `db.js` 权限 / 角色种子;`PermissionsGuard` 对应 `requirePerms` + 前端 `RequirePerm` / `PermissionGate` |
| 3.3 数据表(users 扩展、roles、permissions、user_roles、role_permissions、cocktails 扩展、review_logs、audit_logs) | `db.js` 同名内存表 |
| 4.1 认证上下文(401 / 403、禁用即时生效) | `mockServer.js` `auth()`;任意接口 401 时前端自动登出 |
| 4.3 后台接口全表 | `client.js`(每个方法上标注对应 REST 路径) |
| 越权保护(最后一个 super_admin、不可操作更高角色、不可禁自己、系统角色限制) | `mockServer.js` `guardRank` / `enabledSuperAdminCount` 等 |
| 审计要求(操作者 / 原因 / 前后快照 / requestId;删除不清历史) | 每个写接口末尾的 `audit()`,审计页可展开 before → after |
| 审核动作与内容状态在"事务"中同时落日志 | `transition()`:状态 + review log + audit log 一并写入 |

页面:登录 → 工作台(统计 + **「最近热门」ImageTrail 拖影区**:光标滑过时甩出按周浏览量排序的热门酒单小酒牌,数据来自 `getDashboard` 的 `hotCocktails`,只统计已上架且非私密的内容;触屏与减弱动效环境自动降级为横滑卡片列 + 审核队列)→ 酒单列表 / 详情(审核、驳回、上下架、运营修订、软删除、流转时间线)→ 用户管理(详情抽屉、禁用带原因、角色分配)→ 角色与权限(新建 / 编辑,超管权限锁定)→ 审计日志(快照对比)。驳回 / 下架 / 禁用均**强制填写原因**。

## 目录结构

```
src/
  api/
    request.js       # fetch 封装:baseURL、get/post/put/patch/delete、token 注入、
                     # 响应解包与错误规整({status, message})
    normalize.js     # DTO 归一化(分页 / 角色 / 权限 / 会话等字段兼容)
    modules/         # 全部接口按业务域归类,方法旁注明对应 REST 路径
      auth.js        #   api.auth      login / me
      user.js        #   api.user      list / detail / updateStatus / setRoles
      cocktail.js    #   api.cocktail  list / detail / approve / reject / offline / publish / update / remove
      role.js        #   api.role      list / create / update
      audit.js       #   api.audit     list
      dashboard.js   #   api.dashboard overview(含无聚合接口时的前端拼装)
    index.js         # 出口:export const api;VITE_USE_MOCK=1 时切换到 mockClient
    mockClient.js    # Mock 适配层(与 modules 同构,离线演示)
    db.js            # Mock 种子数据
    mockServer.js    # Mock 业务规则(鉴权 / RBAC / 状态机 / 日志)
  store/             # Redux Toolkit:auth / users / cocktails / system / toast
  components/
    react-bits/      # 动效组件本地实现
    ui.jsx           # 按钮、徽章、弹窗、抽屉、表格、Toast、PermissionGate…
  layout/            # AdminLayout(侧边栏按权限过滤)、路由守卫
  pages/             # Login / Dashboard / Cocktails / CocktailDetail / Users / Roles / AuditLogs
```

## API 层用法

技术栈为原生 fetch,封装在 `src/api/request.js`(统一 baseURL、query 序列化、`Bearer token` 注入、错误规整);业务代码不直接调 fetch,而是从 `src/api` 引入按域归类的 `api` 对象:

```js
import { api } from '@/api'; // 本项目内为相对路径 '../api'

await api.auth.login({ email, password });        // POST  /auth/login
await api.user.list({ page: 1, status: 'active' }); // GET  /admin/users
await api.cocktail.reject(id, { reason });        // POST  /admin/cocktails/:id/reject
await api.role.update(id, { permissionIds });     // PATCH /admin/roles/:id
await api.dashboard.overview();                   // GET   /admin/dashboard(缺失时前端拼装)
```

模块与文档 4.3 的路径映射写在每个方法的注释上:auth(`/auth/login`、`/auth/me`)、user(`/admin/users` 及 `:id/status`、`:id/roles`)、cocktail(`/admin/cocktails` 及 `:id/approve|reject|offline|publish`、`PATCH|DELETE :id`)、role(`GET|POST /admin/roles`、`PATCH :id`)、audit(`/admin/audit-logs`)。新增接口时:在对应 module 文件加一个方法即可;后端 DTO 有出入优先在 `normalize.js` 消化,页面与 Redux 不感知。

## 已内置的守护规则(对应文档验收清单)

- 仅 `pending` 可通过 / 驳回;仅 `published` 可下架;仅 `offline` 可重新上架;非法流转返回 409。
- 驳回、下架、禁用必须填原因;原因写入审核 / 审计日志并在详情页展示。
- 运营修订走白名单字段,审计日志保留修改前后快照;删除为软删除,审核与审计历史不受影响。
- 被禁用账号登录、会话恢复、任意受保护接口全部即时拒绝。
- 不能禁用自己;不能操作角色等级高于自己的用户;系统必须保留至少一名启用的超级管理员;系统角色标识不可改、超管权限集合锁定。
- 无权限的导航项直接隐藏,直达 URL 会被 `RequirePerm` 拦到 403 页。

> 以上规则在真实模式下由后端裁决(前端只透出 message 并做入口隐藏);Mock 模式下由 `mockServer.js` 完整模拟,便于无后端时验收交互。
