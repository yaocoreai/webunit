import type { SlotScope } from './model';

export async function loadSectionLabel(key: string): Promise<string | undefined> {
  const { sectionSettings } = await import('@/platform/generated/theme/setting-runtime');
  const loader = sectionSettings[key as keyof typeof sectionSettings];
  return loader ? (await loader()).default.label : undefined;
}

export async function loadSlotDefinition(
  scope: SlotScope,
  templateKey: string,
  slotKey: string,
) {
  const [{ layoutSetting }, { templateSettings }] = await Promise.all([
    import('@/platform/generated/theme/definition'),
    import('@/platform/generated/theme/setting-runtime'),
  ]);
  const templateLoader = templateSettings[templateKey as keyof typeof templateSettings];
  const definition = scope === 'layout'
    ? (await layoutSetting()).default
    : templateLoader
      ? (await templateLoader()).default
      : undefined;
  return definition?.slots.find((item) => item.key === slotKey);
}
