# Web app manifest

## 当前原理

`defineManifestData` 写 Web app manifest 模板，和站点 manifest 不是一份数据。`locale` 用 `*` 表示全部语言。`manifestJson` 里的字符串可以引用站点字段，例如 `site.fields.title`。图片字段经 `image_url` 变成地址。

## 代码入口

- `src/theme/datas/manifests/index.ts`
