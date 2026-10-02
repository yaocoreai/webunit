# Layout

## 当前原理

`defineLayoutData` 写整站框。`settings` 放颜色和字体。`messages` 放与页面无关的短文案。`slots` 挂页头和页脚，槽是 `layout.header`、`layout.footer`。

中文用 `defineLayoutDataTranslation`，按区块实例 `id` 覆盖 messages 和 settings。

页头导航写在页头实例的 settings，不读菜单资源。见 [theme-menus.md](theme-menus.md)。

## 代码入口

- `src/theme/datas/layout/index.ts`
- `src/theme/layout/render.astro`
