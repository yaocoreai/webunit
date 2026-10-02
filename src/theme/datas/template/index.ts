import articleDefault from './article.default';
import errorDefault from './error.default';
import pageDefault from './page.default';
import { defineTemplateDatas } from '@/platform/datas';

export default defineTemplateDatas({
  'article.default': articleDefault,
  'error.default': errorDefault,
  'page.default': pageDefault,
});
