# Function

体系见 [architecture-function.md](architecture-function.md)。业务在 `features/internal`。

页面和文案不进 Function。路由清单在 `src/function/bootstrap/generated/route/manifest.ts`，由 `pnpm generate:registry` 生成，不手改。

## 取舍

管理路由不挂 `admin` 中间件。本站没有管理会话，中间件名对不上会在调用时抛错。重新评估条件：有管理会话。

## 功能

- 配置。[function-config.md](function-config.md)
- 枚举。[function-enums.md](function-enums.md)
- 存储。[function-storage.md](function-storage.md)
- 运行状态。[function-runtime.md](function-runtime.md)

## 代码入口

- `src/function/bootstrap/application.ts`
- `src/function/app/route-modules.ts`
- `src/function/app/capabilities.ts`
