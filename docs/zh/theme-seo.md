# SEO

## 当前原理

模板在 manifest 的 `seo` 和 `defineSeoData` 各登记一次，`id` 对齐。`owner.type` 是 `site` 或 `module`。模块模板再写 `owner.key`。`locale` 用 `*` 表示全部语言。

`content` 里的字符串是模板。变量从 `site.fields`、`entry.fields`、`entry.page`、`parentEntry`、`route`、`locale` 取。过滤器接在 `|` 后面。条目字段没有值时，用 `default` 回落到站点字段。

## 代码入口

- `src/theme/datas/seo/index.ts`
- `src/theme/datas/seo/content.ts`
- `src/manifest.ts`
- `src/platform/manifest/seo-template.ts`
