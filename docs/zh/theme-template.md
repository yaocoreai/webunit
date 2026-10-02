# Template

## 当前原理

`defineTemplateDatas` 按 `模板key.实例id` 登记。共用文案写在该实例的 settings 和 messages。中文用 `defineTemplateDataTranslation` 覆盖这些字段。

页面正文不写在这里。随页面拼出来的区块文案在条目槽上，见 [theme-page.md](theme-page.md)。随条目走的正文写在 entry fields，见 [theme-module.md](theme-module.md)。

错误页的状态码文案用 message `code.{status}`。没有对应键时用 `code.default`。

## 代码入口

- `src/theme/datas/template/index.ts`
