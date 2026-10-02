# Enums

## 当前原理

能力依赖 `database`。

公开面按 key 列出 `visibility` 为 `public` 的目录和取值。管理面列出目录、读取一条、按 `expectedRevision` 更新，以及列出取值。取值可按 parent 过滤，或只要根节点。

## 代码入口

- `src/function/features/internal/enums/routes.ts`
- `src/function/common/enums/capability.ts`
