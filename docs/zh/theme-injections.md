# Document injections

## 当前原理

`defineDocumentInjectionsData` 登记要注入的脚本和标记。布局在 `head-start`、`head-end`、`body-start`、`body-end` 按 placement 输出，且只在 production。脚本不写进页面正文。

条目可以要求 consent 用途。浏览器在该用途被允许后才执行。

## 代码入口

- `src/theme/datas/document-injections/index.ts`
- `src/theme/layout/render.astro`
- `src/platform/theme/consent/injections.ts`
