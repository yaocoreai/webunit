import type { PlaceholderImageDefinition, PlaceholderImageName, PlaceholderImageOptions } from './types';

const DEFAULT_SIZE = 1024;
const MAX_DIMENSION = 8192;
const DEFAULT_BACKGROUND_COLOR = '#f2f0eb';
const DEFAULT_FOREGROUND_COLOR = '#b8b2a7';
const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i;

const loaders = {
  image: () => import('./image'),
  product: () => import('./product'),
  avatar: () => import('./avatar'),
  article: () => import('./article'),
  collection: () => import('./collection'),
} satisfies Record<PlaceholderImageName, () => Promise<{ default: PlaceholderImageDefinition }>>;

function readDimension(value: number | undefined, name: 'width' | 'height'): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < 1 || value > MAX_DIMENSION) {
    throw new RangeError(`Placeholder image ${name} must be an integer between 1 and ${MAX_DIMENSION}`);
  }
  return value;
}

function readColor(value: string | undefined, name: 'backgroundColor' | 'foregroundColor', fallback: string): string {
  if (value === undefined) return fallback;
  if (!HEX_COLOR.test(value)) throw new TypeError(`Placeholder image ${name} must be a hexadecimal color`);
  return value.toLowerCase();
}

function resolveSize(
  definition: PlaceholderImageDefinition,
  options: PlaceholderImageOptions,
): Readonly<{ width: number; height: number }> {
  const width = readDimension(options.width, 'width');
  const height = readDimension(options.height, 'height');
  if (width && height) return { width, height };
  if (width) return { width, height: Math.max(1, Math.round(width * definition.height / definition.width)) };
  if (height) return { width: Math.max(1, Math.round(height * definition.width / definition.height)), height };
  if (definition.width >= definition.height) {
    return { width: DEFAULT_SIZE, height: Math.round(DEFAULT_SIZE * definition.height / definition.width) };
  }
  return { width: Math.round(DEFAULT_SIZE * definition.width / definition.height), height: DEFAULT_SIZE };
}

export async function placeholderImage(
  name: PlaceholderImageName,
  options: PlaceholderImageOptions = {},
): Promise<string> {
  const definition = (await loaders[name]()).default;
  const { width, height } = resolveSize(definition, options);
  const backgroundColor = readColor(options.backgroundColor, 'backgroundColor', DEFAULT_BACKGROUND_COLOR);
  const foregroundColor = readColor(options.foregroundColor, 'foregroundColor', DEFAULT_FOREGROUND_COLOR);
  const { viewBoxWidth, viewBoxHeight } = definition;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}"><path fill="${backgroundColor}" d="M0 0h${viewBoxWidth}v${viewBoxHeight}H0z"/><g fill="${foregroundColor}">${definition.body}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export type { PlaceholderImageName, PlaceholderImageOptions } from './types';
