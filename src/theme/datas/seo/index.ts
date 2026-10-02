import { defineSeoData } from '@/platform/datas';
import { pageSeoContent, siteSeoContent } from './content';

export default defineSeoData({
  templates: [
    { id: 'site-default', locale: '*', owner: { type: 'site' }, content: siteSeoContent },
    {
      id: 'module-page',
      locale: '*',
      owner: { type: 'module', key: 'page' },
      content: pageSeoContent('WebPage', 'website'),
    },
    {
      id: 'module-article',
      locale: '*',
      owner: { type: 'module', key: 'article' },
      content: pageSeoContent('Article', 'article'),
    },
  ],
});
