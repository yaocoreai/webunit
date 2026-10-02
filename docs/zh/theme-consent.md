# Consent

## 当前原理

`defineConsentData` 写同意配置。`enabled` 为 true，且 `display.mode` 不是 `never`，布局才输出横幅。布局只在 production 输出。

`privacyPolicy` 和 `cookiePolicy` 用 `reference: module.page` 指向页面条目。`necessary` 始终勾选且不能关。可选用途是 `analytics`、`marketing`、`preferences`、`saleOfData`。

文案在 `messages`。中文用 `defineConsentDataTranslation`，只覆盖文案。

## 代码入口

- `src/theme/datas/consent/index.ts`
- `src/theme/layout/render.astro`
