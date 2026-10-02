# Site

本目录是 WebUnit 的 site 运行单元。包名是 `@webunit/site`。

Platform 是脚手架。Function 承载能力，见 [architecture-function.md](architecture-function.md)。Theme 只负责表现，见 [architecture-theme.md](architecture-theme.md)。

## 当前原理

请求进入 Platform Runtime。页面由 Theme 渲染，内容来自 `src/theme/datas`。SSR 经 Direct Router 进入 Function Application，浏览器经 HTTP Router 进入同一个 Application。

环境只由 Platform Runtime 选择。业务代码不读环境变量、Wrangler Binding 或 Astro Runtime。

## 取舍

Workers 是公共契约，Node 和 Container 提供兼容实现。原因是业务语义只有一套。重新评估条件：某个运行时必须拥有另一套业务语义。

## 代码入口

- `src/platform/runtime/workers/entry.ts`
