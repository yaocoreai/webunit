# Site

## 当前原理

`defineSiteData` 写站点记录。`defaultLocale` 是默认语言，`supportedLocales` 是可用语言。英文写在 `fields`。中文用 `defineSiteDataTranslation`，只覆盖有变化的字段。

图片字段用 `defineModuleReferenceData`，指向 storage 的 id，不写进翻译。

`domains`、`redirects`、`files` 是站点记录上的列表。`files` 的项有 `path`、`type`、`content`，用来挂站内文本文件。

## 代码入口

- `src/theme/datas/site/index.ts`
