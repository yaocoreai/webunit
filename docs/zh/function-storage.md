# Storage

## 当前原理

能力依赖 `cache` 和 `objectStorage`。

公开面创建、续传、完成、查询、签名分片和中止上传。读取有三条 GET，响应是文件：

- `public.storage.read.signed`：`/public/storage/read/*`
- `public.storage.read.instance`：`/public/storage-instances/:storageKey/*`
- `public.storage.read.public`：`/public/storage/*`

签名地址由 `createStorageReadUrl` 生成，前缀是 `/_`。

管理面读取运行状态和上传会话，浏览目录，读写对象和目录，签发读取地址，列挂载，签发上传票据。

## 边界

页面图片登记在 theme datas，不走这个目录和上传会话。见 [theme-storage.md](theme-storage.md)。

## 代码入口

- `src/function/features/internal/storage/routes.ts`
- `src/function/common/storage/capability.ts`
