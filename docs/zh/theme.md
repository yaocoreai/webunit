# Theme

体系见 [architecture-theme.md](architecture-theme.md)。这里是开发索引：每篇说明一块怎么声明、怎么填、改完怎么生成。不记录当前站点的文案和条目。

数组项按字符串 `id` 合并。区块 setting 里的 default 不并进渲染实例。要显示的文案写在 datas 的实例 settings。

改了 section、template 或 manifest 的结构后运行 `pnpm generate:registry`。`src/platform/generated` 不手改。

## 功能

- 站点。[theme-site.md](theme-site.md)
- 布局。[theme-layout.md](theme-layout.md)
- 菜单。[theme-menus.md](theme-menus.md)
- 模块。[theme-module.md](theme-module.md)
- 页面。[theme-page.md](theme-page.md)
- 模板实例。[theme-template.md](theme-template.md)
- 存储。[theme-storage.md](theme-storage.md)
- SEO。[theme-seo.md](theme-seo.md)
- Consent。[theme-consent.md](theme-consent.md)
- Web app manifest。[theme-manifests.md](theme-manifests.md)
- 文档注入。[theme-injections.md](theme-injections.md)
- 零件。[theme-partials.md](theme-partials.md)
