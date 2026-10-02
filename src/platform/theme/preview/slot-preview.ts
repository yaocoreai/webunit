import { asRecord, readString } from '@/platform/theme/render/value';
import type { SlotPreviewItem, SlotPreviewRuntime, SlotPreviewViewport } from '@/platform/theme/render/slot-preview';
import { isSlotAvailableAtWidth } from '@/platform/theme/define';

export type { SlotPreviewItem, SlotPreviewRuntime } from '@/platform/theme/render/slot-preview';

export async function prepareSlotPreviewRuntime(
  templateKey: string,
  viewport: SlotPreviewViewport,
  activeSlot?: string,
  viewportWidth = 1600,
): Promise<SlotPreviewRuntime | undefined> {
  const [{ layoutSetting }, { templateFrames }, { templateSettings }] = await Promise.all([
    import('@/platform/generated/theme/definition'),
    import('@/platform/generated/theme/render-runtime'),
    import('@/platform/generated/theme/setting-runtime'),
  ]);
  const loader = templateSettings[templateKey as keyof typeof templateSettings];
  if (!loader) return undefined;
  const definitions: unknown[] = [(await loader()).default];
  if (templateFrames[templateKey as keyof typeof templateFrames] === '') {
    definitions.push((await layoutSetting()).default);
  }
  const slots = definitions.flatMap((definition) => readSlots(definition, viewportWidth));
  if (activeSlot && !slots.some((slot) => slot.key === activeSlot)) return undefined;
  return { templateKey, viewport, viewportWidth, ...(activeSlot ? { activeSlot } : {}), slots };
}

function readSlots(definition: unknown, viewportWidth: number): SlotPreviewItem[] {
  const value = asRecord(definition);
  return (Array.isArray(value?.slots) ? value.slots : []).flatMap((item) => {
    const slot = asRecord(item);
    const key = readString(slot?.key);
    if (!key) return [];
    const availableWhen = asRecord(slot?.availableWhen);
    const availability = {
      availableWhen: availableWhen ? {
        ...(typeof availableWhen.minWidth === 'number' ? { minWidth: availableWhen.minWidth } : {}),
        ...(typeof availableWhen.maxWidth === 'number' ? { maxWidth: availableWhen.maxWidth } : {}),
      } : undefined,
    };
    return [{ key, label: readString(slot?.label) || key, available: isSlotAvailableAtWidth(availability, viewportWidth) }];
  });
}
