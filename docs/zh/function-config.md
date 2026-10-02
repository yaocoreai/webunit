# Config

## 当前原理

能力依赖 `cache` 和 `database`。

公开面按 namespace 和 key 读取一条记录。管理面列出、读取、更新和删除。更新可带 `visibility`：`private` 或 `public`。公开读取只返回 `public` 记录。

## 代码入口

- `src/function/features/internal/config/routes.ts`
- `src/function/common/config/capability.ts`
