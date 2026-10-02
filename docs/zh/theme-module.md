# Module

## 当前原理

`src/manifest.ts` 用 `defineSiteManifestProperties` 声明属性，用 `defineSiteManifestModule` 声明模块。条目数据再按模块 key 写进 `src/theme/datas/modules`。

属性挂在 `site.properties`、模块的 `moduleProperties`、模块的 `entryProperties`。菜单也可以挂 `properties`。属性有 `key`、`label`、`type`。`key` 小写，中间用 `_` 或 `-`。`required` 和 `locale` 可选。`locale` 只对 `text`、`textarea`、`heading`、`html`、`rich`、`code`、`link`、`links`、`json`、`table` 有效。

`type` 只接受内置值类型：

- 文本：`text`、`textarea` 是字符串。`heading` 是 `level` 加 `value`，`level` 从 1 到 6。`code` 是 `language` 加 `content`。`html`、`rich` 是编辑器文档。
- 标量：`number`、`switch`、`color`、`json`。`select` 必须写 `options`，每项有 `label` 和 `value`。`date` 是 `YYYY-MM-DD`。`time` 是 `HH:mm` 或 `HH:mm:ss`。`datetime` 是日期、空格、时间。`price` 只有 `amountMinor`。`spacing` 是四边间距。
- 引用：`file`、`image`、`audio`、`video`、`menu`、`form` 各有一个复数，复数是数组。`module`、`modules` 必须写 `reference`，值是模块 key，并且不能 `locale`。只有这两种能写 `reference`。
- 结构：`link`、`links`。`object`、`tree` 必须写 `fields`。`array` 必须写 `items`，可写 `minItems`、`maxItems`。`table` 必须写 `columns` 或 `columnForm`，单元格是字符串。`tree` 的 `id`、`children` 保留，可写 `maxDepth`，默认 10，最大 10。

`kind` 不写时是 `page`。page 模块必须有 `routePrefix`。`templateKey` 不写时用模块 `key`。`model` 模块不能写 `routePrefix`、`templateKey`、`sitemap`。

加一种内容：先在 manifest 加模块和 `entryProperties`，再在 `modules/模块key` 写条目。英文用 `defineModuleEntryData`。中文在同目录按条目 id 分文件，导出 `translations`。

随条目走的正文写在 entry fields。随页面拼出来的区块文案写在槽实例 settings。页面槽见 [theme-page.md](theme-page.md)。

## 代码入口

- `src/manifest.ts`
- `src/platform/manifest/types.ts`
- `src/platform/manifest/define.ts`
- `src/platform/schema/value-types.ts`
