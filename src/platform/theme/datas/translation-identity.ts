export type DatasTranslationIdentity = Readonly<{ namespace: string; key: string }>;

export type DatasTranslationScope = Readonly<{
  siteId: string;
  themeId: string;
}>;

export const datasTranslationIdentity = {
  siteFields: (siteId: string): DatasTranslationIdentity => ({ namespace: `cms.site.${siteId}`, key: 'fields' }),
  consent: (siteId: string): DatasTranslationIdentity => ({ namespace: `cms.site.${siteId}`, key: 'consent' }),
  layout: ({ siteId, themeId }: DatasTranslationScope): DatasTranslationIdentity => ({ namespace: `cms.layout.${siteId}`, key: themeId }),
  template: ({ siteId, themeId }: DatasTranslationScope, templateInstanceId: string): DatasTranslationIdentity => ({ namespace: `cms.template.${siteId}.${themeId}`, key: templateInstanceId }),
  menu: (siteId: string, menuId: string): DatasTranslationIdentity => ({ namespace: `cms.menu.${siteId}`, key: menuId }),
  moduleFields: (siteId: string, moduleId: string): DatasTranslationIdentity => ({ namespace: `cms.module.${siteId}.fields`, key: moduleId }),
  entryFields: (siteId: string, moduleId: string, entryId: string): DatasTranslationIdentity => ({ namespace: `cms.module.${siteId}.${moduleId}.entry`, key: entryId }),
  page: (siteId: string, moduleId: string, entryId: string): DatasTranslationIdentity => ({ namespace: `cms.module.${siteId}.${moduleId}.page`, key: entryId }),
  storage: (siteId: string, assetId: string): DatasTranslationIdentity => ({ namespace: `cms.storage.${siteId}`, key: assetId }),
} as const;
