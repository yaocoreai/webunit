# Storage

## 当前原理

资源用 storage 数据登记。类型是 `file`、`image`、`audio`、`video`。`id` 是 `目录-文件名`，去掉扩展名。`title` 默认英文。中文在同文件 `translations`，键是资源 `id`。

交付是站内文件时，`url` 从 `/storage/` 起，可写 `contentType`。也可以是 embed：视频是 YouTube、Vimeo，音频是 Spotify、SoundCloud。图片可写宽高和 `alt`。音频和视频可写 `duration`。视频可写 `poster`。

页面引用用 `defineModuleReferenceData(type, id)`，读 `delivery.url`。`type` 与登记类型一致。

图片按目录放：`images/brand`、`images/page`、`images/news`。默认 webp。必须用 png 的图标，`id` 末尾加 `-png`。

## 边界

`src/theme/assets` 只放样式、脚本和字体。

## 代码入口

- `src/theme/datas/storage/index.ts`
- `src/platform/theme/content/public.ts`
