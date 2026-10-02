export type SlotPreviewViewport = string;

export type SlotPreviewItem = Readonly<{ key: string; label: string; available: boolean }>;

export type SlotPreviewRuntime = Readonly<{
  templateKey: string;
  viewport: SlotPreviewViewport;
  viewportWidth: number;
  activeSlot?: string;
  slots: readonly SlotPreviewItem[];
}>;
