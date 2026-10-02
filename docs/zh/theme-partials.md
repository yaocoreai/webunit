# Partials

## 当前原理

`src/theme/partials` 放没有文案的零件。区块和布局从这里引用，不在区块里重写标签。

`link`、`image`、`audio`、`video`、`rich-text` 把 props 和 slot 转给平台同名组件。图片传 `asset`。链接传 `href`，或平台的 `link`。音频和视频还要 `label`。富文本传 `value`。样式用布局里的字体和颜色。

文章正文是 Markdown 字符串，由 `src/theme/markdown.ts` 绘制，不走 `rich-text`。

## 取舍

语言切换不用 `link`。英文路径没有前缀，中文页上的 Link 会按当前地址再加一次 `/zh`。重新评估条件：平台 Link 不再按当前语言重写已带前缀的路径。

## 代码入口

- `src/theme/partials/link/render.astro`
- `src/theme/partials/image/render.astro`
- `src/theme/partials/audio/render.astro`
- `src/theme/partials/video/render.astro`
- `src/theme/partials/rich-text/render.astro`
- `src/theme/markdown.ts`
