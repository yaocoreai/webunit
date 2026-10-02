export type PreviewTarget =
  | { type: 'template'; key: string }
  | { type: 'section'; key: string };

export type PreviewEnvironmentRequest = Readonly<{
  viewportId?: string;
  viewportWidth: number;
  viewportHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  pixelRatio: number;
}>;

export type PreviewRequest =
  | { target: { type: 'section'; key: string }; presentation: { content: 'defaults'; environment: PreviewEnvironmentRequest } }
  | {
      target: { type: 'template'; key: string };
      presentation:
        | { content: 'sections'; environment: PreviewEnvironmentRequest }
        | { content: 'slots'; viewport: SlotPreviewViewport; activeSlot?: string; environment: PreviewEnvironmentRequest };
    };

export type SlotPreviewViewport = string;

type ParseResult = { value: PreviewRequest } | { error: string };

export function parsePreviewRequest(url: URL): ParseResult {
  const allowedKeys = new Set(['type', 'key', 'content', 'slot', 'viewport', 'vw', 'vh', 'cw', 'ch', 'dpr', 'ticket']);
  if ([...url.searchParams.keys()].some((name) => !allowedKeys.has(name))) return { error: 'Invalid query' };
  if ([...allowedKeys].some((name) => url.searchParams.getAll(name).length > 1)) return { error: 'Invalid query' };

  const type = url.searchParams.get('type');
  const key = url.searchParams.get('key') ?? '';
  const contentValue = url.searchParams.get('content');
  const activeSlot = url.searchParams.get('slot') ?? undefined;
  const viewportValue = url.searchParams.get('viewport');
  const positiveNumber = (key: string, fallback: number) => {
    const raw = url.searchParams.get(key);
    if (raw === null) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };
  const viewportWidth = positiveNumber('vw', 1600);
  const viewportHeight = positiveNumber('vh', 900);
  const canvasWidth = positiveNumber('cw', viewportWidth ?? 1600);
  const canvasHeight = positiveNumber('ch', viewportHeight ?? 900);
  const pixelRatio = positiveNumber('dpr', 1);
  if (!viewportWidth || !viewportHeight || !canvasWidth || !canvasHeight || !pixelRatio) return { error: 'Invalid preview environment' };
  const environment = { ...(viewportValue ? { viewportId: viewportValue } : {}), viewportWidth, viewportHeight, canvasWidth, canvasHeight, pixelRatio };
  if (type !== 'template' && type !== 'section') return { error: 'Invalid preview target' };
  if (!key) return { error: 'Preview key is required' };

  if (type === 'section') {
    if (contentValue !== null || activeSlot) return { error: 'Section preview does not accept presentation options' };
    return { value: { target: { type, key }, presentation: { content: 'defaults', environment } } };
  }

  const content = contentValue === 'sections' || contentValue === 'slots'
    ? contentValue
    : undefined;
  const viewport = viewportValue && /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(viewportValue) ? viewportValue : undefined;
  if (!content || (activeSlot && content !== 'slots') || (content === 'slots' && !viewport)) return { error: 'Invalid template presentation' };
  return {
    value: {
      target: { type, key },
      presentation: content === 'slots'
        ? { content, viewport: viewport!, ...(activeSlot ? { activeSlot } : {}), environment }
        : { content, environment },
    },
  };
}
