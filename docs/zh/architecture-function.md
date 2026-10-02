# Function

Function 承载能力。功能索引在 [function.md](function.md)。

## 当前原理

`app` 只注册。`bootstrap` 是组合根，把路由、能力和基础设施收成一个 Application。通用 Application 与 Entry 在 `common/app`。通用实现在 `common`。业务在 `features`。Node、Workers、Container 的适配在 `infrastructure`。

SSR 走 Direct Router，浏览器走 HTTP Router。两条路由进同一个 Application。运行时身份在 `src/platform/runtime/`。应用配置收口在 `src/function/bootstrap/runtime-policy.ts`。

## 边界

- Feature 和 Common 不导入 Infrastructure。`bootstrap` 可以导入，它是组合根。
- Workers Infrastructure 不导入 Node 实现。
- 本目录没有 Admin 应用。`admin` 只是路由面。

## 代码入口

- `src/function/bootstrap/application.ts`
- `src/platform/function/runtime.ts`
- `src/platform/function/direct/client.ts`
- `src/platform/function/pages/_/[...path].ts`
