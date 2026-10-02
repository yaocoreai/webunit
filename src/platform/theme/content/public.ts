import type { MetaPriceValue } from '@/platform/theme/define';
import { getCurrencyMinorUnit } from '@/platform/theme/content/price';

export type CmsAssetType = 'file' | 'image' | 'audio' | 'video';
export type CmsAssetDelivery =
  | { type: 'file'; url: string; contentType?: string }
  | { type: 'embed'; provider: string; url: string };
export type CmsAsset<TType extends CmsAssetType = CmsAssetType> = {
  id: string;
  type: TType;
  title: string;
  alt?: TType extends 'image' ? string : never;
  delivery: CmsAssetDelivery;
  width?: number;
  height?: number;
  duration?: number;
  publishedAt?: string;
  poster?: { url: string };
};
export type ModuleEntry<TFields extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>> = {
  id: string;
  parentId?: string;
  fields: TFields;
  page: null | { routeKey: string; path: string };
};
export type CmsLink =
  | { type: 'path'; title: string; target: '_self' | '_blank'; href: string; resource: null }
  | { type: 'module'; reference: string; id: string; title: string; target: '_self' | '_blank'; href: string; resource: ModuleEntry };
export type CmsMenuItem<TFields extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>> = {
  id: string;
  link: CmsLink;
  fields: TFields;
  children: readonly CmsMenuItem<TFields>[];
};
export type CmsMenu<TFields extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>> = { id: string; items: readonly CmsMenuItem<TFields>[] };

export type ResourceAccessor<T> = <TIds extends string | readonly string[]>(ids: TIds) => Promise<
  TIds extends string ? T | null : readonly (T | null)[]
>;

export type PublicContentApi = {
  asset: ResourceAccessor<CmsAsset>;
  menu: ResourceAccessor<CmsMenu>;
  module<TEntry extends ModuleEntry = ModuleEntry>(key: string): import('@/platform/theme/content/model').ReadModel<TEntry>;
};

export type { ContentCacheDependency } from "@/platform/cache/contracts";
import type { ContentCacheDependency } from "@/platform/cache/contracts";

export type PublicApiContext = Readonly<{
  domainHost: string;
  locale: string;
  signal: AbortSignal;
  registerDependency?: (dependency: ContentCacheDependency) => void;
}>; 

export function formatPrice(price: MetaPriceValue, locale = 'en'): string {
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: price.currency });
  const fractionDigits = getCurrencyMinorUnit(price.currency);
  return formatter.format(price.amountMinor / (10 ** fractionDigits));
}
