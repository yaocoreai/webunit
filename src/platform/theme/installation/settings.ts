import { validateSettingBindings, type SettingDefinition, type SettingBindings } from '@/platform/theme/define';

type RecordValue = Readonly<Record<string, unknown>>;

const asRecord = (value: unknown): RecordValue | undefined => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : undefined;

function readResourcePaths(ownerType: 'layout' | 'template' | 'section', ownerKey: string, definition: unknown) {
  const resources: Array<Readonly<{ ownerType: string; ownerKey: string; path: string; resourceType: string; multiple: boolean }>> = [];
  const visitNode = (field: RecordValue, path: string) => {
    const type = typeof field.type === 'string' ? field.type : '';
    if (type === 'object' && Array.isArray(field.fields)) {
      for (const rawChild of field.fields) {
        const child = asRecord(rawChild);
        const key = typeof child?.key === 'string' ? child.key : undefined;
        if (child && key) visitNode(child, `${path}.${key}`);
      }
    }
    if (type === 'array') {
      const items = asRecord(field.items);
      if (items) visitNode(items, `${path}[]`);
    }
    const known = { file: 'file', files: 'file', image: 'file', images: 'file', audio: 'file', audios: 'file', video: 'file', videos: 'file', menu: 'menu', menus: 'menu', link: 'link', links: 'link' } as const;
    const resourceType = type === 'module' || type === 'modules' ? field.reference : known[type as keyof typeof known];
    if (typeof resourceType === 'string') resources.push({ ownerType, ownerKey, path, resourceType, multiple: ['modules', 'files', 'images', 'audios', 'videos', 'menus', 'links'].includes(type) });
  };
  const visit = (fields: unknown, prefix = '') => {
    if (!Array.isArray(fields)) return;
    for (const rawField of fields) {
      const field = asRecord(rawField);
      if (!field || typeof field.id !== 'string' || typeof field.type !== 'string') continue;
      const path = prefix ? `${prefix}.${field.id}` : field.id;
      if (field.type === 'object') visit(field.fields, path);
      if (field.type === 'array') visit(asRecord(field.items)?.fields, `${path}[]`);
      visitNode(field, path);
    }
  };
  visit(asRecord(definition)?.settings);
  return resources;
}

export function createInstallationSettings(input: Readonly<{ manifest: RecordValue; layout: RecordValue; templates: readonly RecordValue[]; sections: readonly RecordValue[] }>) {
  const templates = [...input.templates].sort((left, right) => String(left.key).localeCompare(String(right.key)));
  const sections = [...input.sections].sort((left, right) => String(left.key).localeCompare(String(right.key)));
  const templateInstances = [
    ...templates.map((template) => String(template.key) === 'error'
      ? { templateKey: 'error', instanceKey: 'error.default', groupKey: 'error', moduleKey: null }
      : { templateKey: String(template.key), instanceKey: `${String(template.key)}.default` }),
  ];
  for (const definition of [input.layout, ...templates, ...sections]) {
    const settings = (definition.settings ?? []) as readonly SettingDefinition[];
    validateSettingBindings(settings, definition.settingBindings as SettingBindings | undefined);
  }
  return {
    package: asRecord(input.manifest.package) ?? {},
    viewport: input.manifest.viewport ?? { strategy: 'responsive', minWidth: 375 },
    installation: input.manifest.installation,
    site: input.manifest.site,
    menu: input.manifest.menu,
    modules: input.manifest.modules,
    seo: input.manifest.seo,
    layout: input.layout,
    templates,
    sections,
    templateInstances,
    resources: [
      ...readResourcePaths('layout', String(asRecord(input.manifest.package)?.key), input.layout),
      ...templates.flatMap((definition) => readResourcePaths('template', String(definition.key), definition)),
      ...sections.flatMap((definition) => readResourcePaths('section', String(definition.key), definition)),
    ],
  } as const;
}
