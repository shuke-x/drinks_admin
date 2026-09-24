# 管理端加固与部署契约

## 会话

默认 `VITE_AUTH_MODE=memory`，兼容现有 Bearer 后端。access token 仅保存在请求模块内存中，不进入 Redux；前端最多使用十分钟。refresh token 不保存也不用于自动刷新。刷新、关闭页面或认证过期后需要重新登录。启动时清理旧版本 localStorage / sessionStorage 的两个 token 键，保留主题偏好。

前端十分钟限制不能缩短已签发 JWT 的服务端有效期。后端仍需将管理端 access token TTL 设为不超过十分钟，并实现禁用账号、权限变化及注销后的会话撤销。本仓库没有后端，未修改或验证线上 Cookie、JWT TTL 或撤销策略。

推荐在后端完成以下契约后设置 `VITE_AUTH_MODE=cookie` 并重新构建：

1. 通过同源 `/api/v1` 反向代理提供接口。会话 Cookie 使用 `Secure; HttpOnly; SameSite=Strict`（确需跨站入口时评估 `Lax`），限定 Path，避免宽泛 Domain。生产使用 HTTPS。
2. `GET /auth/challenge` 在返回 RSA 公钥和 challengeId 的同时，签发与会话/挑战绑定的 `backbar_csrf` Cookie。该 Cookie 可由 JS 读取，因为它只存 CSRF 凭据，不能存会话令牌；同源部署时其 Path 必须覆盖管理页面。
3. 登录、刷新、注销及所有非 GET/HEAD/OPTIONS 请求（包括上传）必须校验 `X-CSRF-Token`，验证其绑定关系，并校验 Origin；不能只比较客户端自造的两份字符串。前端缺少 CSRF Cookie 时会拒绝发送变更请求。
4. `POST /auth/login` 通过 Set-Cookie 建立会话；响应可只含 user/permissions。不要在响应 JSON 中返回 refresh token。`GET /auth/me` 返回带 id 的 user 及有效 permissions。
5. `POST /auth/refresh` 从 HttpOnly Cookie 读取并轮换 refresh token；无需请求 JSON body。成功支持 204；失败返回 401。前端合并并发刷新，每个原请求最多重试一次。刷新后仍需可读取有效 CSRF Cookie。
6. `POST /auth/logout` 接收空 JSON 对象，撤销服务端会话并清理所有会话及 CSRF Cookie。网络失败时前端仍退出本地会话并提示失败，但不能保证服务端已经注销。

绝对地址 API 必须单独验证 Cookie 的站点范围、CORS 凭据和 CSRF 凭据传递；默认契约针对同源部署。前端路由权限只是界面控制，后端必须独立鉴权。

## 类型迁移

`strict: true` 已启用，移除了 `noCheck` 和 `noImplicitAny: false`。构建会执行真实 TypeScript 检查；Redux hooks/thunks、登录、会话、角色权限、品饮记录和风味 DTO 以及通用组件属性已有类型，catch 使用统一的 unknown 错误归一化。

旧接口的兼容字段仍通过明确的 `LegacyDto` 边界（含 any）承接，request 泛型默认值也保留兼容行为。这不是所有 API 的完整 schema 验证；后续应按模块替换为具体 DTO，并添加运行时校验。不能用关闭 strict 或添加 noCheck 继续迁移。

## 弹层、资源和性能

Modal / Drawer 共用焦点管理：保留自动聚焦、Tab 循环、外部焦点拉回、关闭后恢复触发元素；背景 inert、滚动锁定；Escape 仅作用于最上层弹层。保留已有 inert 和 overflow 状态。

管理页面使用 React.lazy 与 Suspense；Three.js 核心/渲染器独立分块，只随登录页加载。没有提高 Vite 的 500 KB 警告阈值。

已移除 Google Fonts 网络导入，使用现有系统字体回退栈；首次加载不再依赖外部字体服务。若将来加入品牌字体，应以具有许可的本地 woff2 静态资源提供并设置 font-display: swap。服务器 CSP 的 font-src 可限定为 'self'，完整 CSP 需结合实际图片和 API 源配置。

## 验证

```sh
pnpm typecheck
pnpm test
pnpm run build
```

测试覆盖登录恢复/失效、权限路由、Cookie CSRF/并发刷新、角色权限编辑、审核成功/失败与驳回原因、品饮配方编辑与失败反馈、风味关键词处理/失败重试，以及 Modal/Drawer 焦点和嵌套 Escape。

测试使用 jsdom 和模拟 API，不能替代真实 HTTPS 后端的 Cookie 属性、CSRF 拒绝、注销撤销及浏览器/读屏器验收。上线 Cookie 模式前，应在集成环境逐项验证上述服务端契约。
