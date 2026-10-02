# Runtime

## 当前原理

没有单独的 runtime 能力。两条路由只读当前进程。

公开面 `public.runtime.health.read` 返回 `status: ok` 和 `service: webunit-site`。不探测 database 或 storage。

管理面 `admin.runtime.overview.read` 列出能力是否可用。`operational.status` 固定为 `healthy`，`checks` 只记进程。能力键是 `database`、`storage`、`cache`、`rateLimit`、`config`、`enums`、`geo`、`dataProtection`。`rateLimit` 对应运行时的 `rateLimiter`。

## 代码入口

- `src/function/features/internal/runtime/public-routes.ts`
- `src/function/features/internal/runtime/admin-routes.ts`
