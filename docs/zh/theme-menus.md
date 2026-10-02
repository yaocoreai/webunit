# Menus

## 当前原理

`defineMenuData` 按菜单 key 登记。项的链接用 `type: module`，`reference` 指向模块，`id` 指向该模块的条目。中文用同文件的 `translations`，按项 `id` 合并。菜单 key 在 manifest 的 `menu` 里声明。

## 取舍

页头导航写在 layout 页头实例的 settings，不读这份菜单。原因是页头是布局区块，导航和布局文案放在一起。重新评估条件：页头改为读取菜单资源。

## 代码入口

- `src/theme/datas/menus/index.ts`
- `src/manifest.ts`
