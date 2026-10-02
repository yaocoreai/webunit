# Page

## 当前原理

`page` 模块的条目。声明见 [theme-module.md](theme-module.md)。

英文用 `defineModuleEntryData` 写在 `modules/page`。中文在同目录按条目 id 分文件，导出 `translations`。合并键是条目 id，以及槽里区块实例的 `id`。

正文区块挂在槽 `page.main`。文案写在该实例的 settings，不写进 section 的 default。

## 代码入口

- `src/theme/datas/modules/page/index.ts`
