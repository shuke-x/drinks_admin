# Backbar · 酒单后台管理系统

React 18 + Redux Toolkit + React Router 6 + Vite 5 管理前端。所有业务数据、登录认证和角色权限均来自真实服务端。

## 启动

```sh
pnpm install
cp .env.example .env
pnpm run dev
```

默认访问 `http://localhost:5173`，通过 Vite 将 `/api` 请求代理到 `https://dash.shuke.me`。

- `VITE_PROXY_TARGET`：开发环境后端地址，默认 `https://dash.shuke.me`。
- `VITE_API_BASE`：请求前缀，默认 `/api/v1`。
- `VITE_API_TIMEOUT_MS`：普通接口超时毫秒数，默认 `20000`。

使用真实后台账号登录。服务不可用时会提示连接错误。

新增模块可通过 `pnpm run dev:experience-local` 启动，访问 `http://127.0.0.1:5178`；接口代理统一读取 `.env` 中的 `VITE_PROXY_TARGET`，启动命令不再覆盖后端地址。

## 构建

```sh
pnpm run build
```

构建输出为 `dist/`。部署时配置 `/api/v1` 反向代理及页面路由的 SPA 回退。

## 认证与权限

登录先请求 `/auth/challenge`，使用 RSA-OAEP 加密凭据后提交 `/auth/login`。`/auth/me` 返回用户及有效权限，菜单、页面守卫和操作入口依据该权限列表展示。接口鉴权由服务端执行。

请求层处理响应解包、超时和错误。默认使用内存会话，不持久化 access/refresh token，刷新页面需重新登录；后端完成 Cookie 与 CSRF 契约后，可启用 `VITE_AUTH_MODE=cookie` 恢复会话并自动刷新。部署契约、限制与验证命令见 [管理端加固说明](docs/admin-hardening.md)。角色授权和新增权限流程见 [docs/permissions.md](docs/permissions.md)。品饮记录和风味配置分别需要 `records.manage` 和 `flavors.manage`。

## 代码结构

- `src/api/request.ts`：真实 HTTP 请求、认证令牌与错误处理。
- `src/api/normalize.ts`：服务端响应字段归一化。
- `src/api/modules/`：认证、酒单、用户、角色、审计、分类、推荐及品饮记录和风味配置接口。
- `src/api/index.ts`：业务 API 出口。
- `src/auth/permissions.ts`：页面和操作入口使用的权限码。
- `src/layout/`：管理布局和路由守卫。
- `src/pages/`：管理页面。
- `src/store/`：Redux 状态管理。

工作台优先请求 `/admin/dashboard`；服务端未提供该聚合接口时，使用真实业务接口组合统计数据。
