# Theme

Theme 只负责表现。内容在 `src/theme/datas`。功能索引在 [theme.md](theme.md)。

## 当前原理

页面由 template、section 和 layout 绘制。模块和属性在 `src/manifest.ts` 声明，见 [theme-module.md](theme-module.md)。默认语言英文。中文只覆盖有变化的字段，路径前缀是 `/zh`。

## 边界

Theme 不导入 Function。

## 代码入口

- `src/manifest.ts`
- `src/theme/datas/index.ts`
- `src/platform/theme/runtime.ts`
