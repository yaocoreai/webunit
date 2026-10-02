# 陈工不摸鱼工作室 · 站点源码

英文：[README.md](README.md)。冲突时以英文为准。

多语言、内容与主题分离。服务端渲染，可部署到 Node、Cloudflare 和容器。

- 多语言。加一种语言只覆盖要改的字段。
- 内容与主题分离。内容在 datas，呈现在 theme。
- 元属性、元模型。字段和内容模型先定义，再填数据。
- 函数计算。控制器、服务、中间件在 function。
- 搜索引擎友好。标题、描述和结构化数据，按语言、整站、模块或单页来写。
- 自带 Consent。隐私选择和 Cookie 策略在系统里。
- 注入与文档分离。脚本注入不写进页面正文。
- 装上 Node.js 就能跑。不依赖第三方服务。
- 可部署到 Node、Cloudflare 或容器。
- 服务端渲染，性能优秀。

https://github.com/yaocoreai/webunit

Linework Studio. 陈工不摸鱼工作室.

## 三层

- **theme**：页面怎么画。模板、区块、布局。Astro 和 Tailwind。
- **datas**：站点、页面、文章和翻译。英文是默认，中文在 `/zh`。
- **function**：控制器、服务、中间件。

运行时在 `platform`。页面上的内容写在 datas。

## 本机

Node 24 起。

```sh
pnpm install
pnpm dev
```

主题数据模式开在 http://localhost:3003。

## 构建

```sh
pnpm build
pnpm build:cloudflare
```

Node，以及 Cloudflare。

## 已实现

- Site 运行单元。[docs/zh/architecture.md](docs/zh/architecture.md)
- Function 体系。[docs/zh/architecture-function.md](docs/zh/architecture-function.md)。功能索引在 [docs/zh/function.md](docs/zh/function.md)
- Theme 体系。[docs/zh/architecture-theme.md](docs/zh/architecture-theme.md)。datas 功能索引在 [docs/zh/theme.md](docs/zh/theme.md)
