import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import { isPublicContentUrl, isTrustedCmsAssetEmbedUrl } from '@/platform/theme/content/url';

export type RichTextStyles = Readonly<Record<string, boolean | string>>;
export type RichTextTextNode = Readonly<{ type: 'text'; text: string; styles: RichTextStyles }>;
export type RichTextLinkNode = Readonly<{ type: 'link'; href?: string; target?: '_blank'; referenceKey?: string; content: readonly RichTextTextNode[] }>;
export type RichTextInlineNode = RichTextTextNode | RichTextLinkNode;
export type RichTextBlock = Readonly<{
  id?: string;
  type: string;
  props?: Readonly<Record<string, unknown>>;
  content?: readonly RichTextInlineNode[] | Readonly<Record<string, unknown>>;
  children?: readonly RichTextBlock[];
}>;
export type RichTextNode = RichTextBlock;
export type RichTextStandardNode = RichTextBlock;
export type RichTextExtensionNode = RichTextBlock;
export type RichTextRendererMap = Readonly<Record<string, AstroComponentFactory>>;
export type RichTextBlockGroup =
  | { readonly kind: 'block'; readonly node: RichTextBlock }
  | { readonly kind: 'list'; readonly list: 'bullet' | 'ordered'; readonly nodes: RichTextBlock[] };

export function groupRichTextLists(nodes: readonly RichTextBlock[], renderers: RichTextRendererMap = {}): RichTextBlockGroup[] {
  const groups: RichTextBlockGroup[] = [];
  for (const node of nodes) {
    const list = renderers[node.type] ? undefined : node.type === 'bulletListItem' ? 'bullet' : node.type === 'numberedListItem' ? 'ordered' : undefined;
    const last = groups.at(-1);
    if (list && last?.kind === 'list' && last.list === list) last.nodes.push(node);
    else if (list) groups.push({ kind: 'list', list, nodes: [node] });
    else groups.push({ kind: 'block', node });
  }
  return groups;
}

const nodeTypePattern = /^[A-Za-z][A-Za-z0-9]{0,63}$/;
const standardTypes = new Set(['paragraph', 'heading', 'quote', 'bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem', 'codeBlock', 'divider', 'image', 'video', 'audio', 'file', 'table']);
const inlineTypes = new Set(['text', 'link']);

export function isRichText(value: unknown): value is readonly RichTextBlock[] {
  return validateBlocks(value, 0, { count: 0 });
}

export function richTextToPlainText(value: readonly RichTextBlock[]): string {
  const parts: string[] = [];
  const visitInline = (node: RichTextInlineNode) => {
    if (node.type === 'text' && node.text.trim()) parts.push(node.text.trim());
    if (node.type === 'link') node.content.forEach(visitInline);
  };
  const visit = (block: RichTextBlock) => {
    if (Array.isArray(block.content)) block.content.forEach(visitInline);
    if (block.type === 'table') tableInlineNodes(block.content).forEach(visitInline);
    block.children?.forEach(visit);
  };
  value.forEach(visit);
  return parts.join(' ');
}

export function isTextNode(node: RichTextInlineNode): node is RichTextTextNode {
  return node.type === 'text';
}

export function safeRichTextHref(value: string): string | undefined {
  const href = value.trim();
  if (!href || href.length > 2_048) return undefined;
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  if (href.startsWith('#')) return href;
  return /^(?:https?:|mailto:|tel:)/i.test(href) ? href : undefined;
}

export function safeRichTextMediaUrl(value: unknown): string | undefined {
  return typeof value === 'string' && isPublicContentUrl(value) ? value : undefined;
}

export function safeRichTextEmbedUrl(provider: unknown, value: unknown): string | undefined {
  return typeof provider === 'string' && typeof value === 'string' && isTrustedCmsAssetEmbedUrl(provider, value) ? value : undefined;
}

export function isStandardRichTextType(type: string): boolean {
  return standardTypes.has(type);
}

function validateBlocks(value: unknown, depth: number, state: { count: number }): value is readonly RichTextBlock[] {
  if (!Array.isArray(value) || depth > 24) return false;
  return value.every((block) => validateBlock(block, depth, state));
}

function validateBlock(value: unknown, depth: number, state: { count: number }): value is RichTextBlock {
  state.count += 1;
  if (state.count > 10_000 || !isRecord(value) || typeof value.type !== 'string' || !nodeTypePattern.test(value.type)) return false;
  if (value.id !== undefined && typeof value.id !== 'string') return false;
  if (value.props !== undefined && !validateJsonValue(value.props, depth + 1)) return false;
  if (value.children !== undefined && !validateBlocks(value.children, depth + 1, state)) return false;
  if (value.type === 'codeBlock') return Array.isArray(value.content) && value.content.every((node) => validateInline(node, depth + 1) && node.type === 'text');
  if (value.type === 'divider') return value.content === undefined || (Array.isArray(value.content) && value.content.length === 0);
  if (value.type === 'table') return validateTableContent(value.content, depth + 1);
  if (['image', 'video', 'audio'].includes(value.type)) return value.content === undefined || (Array.isArray(value.content) && value.content.length === 0);
  if (value.type === 'file') return value.content === undefined || (Array.isArray(value.content) && value.content.every((node) => validateInline(node, depth + 1)));
  return Array.isArray(value.content) && value.content.every((node) => validateInline(node, depth + 1));
}

function validateInline(value: unknown, depth: number): value is RichTextInlineNode {
  if (!isRecord(value) || typeof value.type !== 'string' || !inlineTypes.has(value.type)) return false;
  if (value.type === 'text') return typeof value.text === 'string' && isRecord(value.styles) && validateJsonValue(value.styles, depth + 1);
  const hasReference = typeof value.referenceKey === 'string' && /^[A-Za-z0-9_-]+$/.test(value.referenceKey);
  const hrefOk = typeof value.href !== 'string' || safeRichTextHref(value.href) !== undefined;
  const validTarget = hasReference ? hrefOk : typeof value.href === 'string' && hrefOk;
  return validTarget && Array.isArray(value.content) && value.content.every((item) => validateInline(item, depth + 1) && item.type === 'text');
}

function tableInlineNodes(content: RichTextBlock['content']): RichTextInlineNode[] {
  if (!isRecord(content) || !Array.isArray(content.rows)) return [];
  return content.rows.flatMap((candidateRow) => {
    if (!isRecord(candidateRow) || !Array.isArray(candidateRow.cells)) return [];
    return candidateRow.cells.flatMap((cell) => {
      if (Array.isArray(cell)) return cell as RichTextInlineNode[];
      return isRecord(cell) && Array.isArray(cell.content) ? cell.content as RichTextInlineNode[] : [];
    });
  });
}

function validateTableContent(value: unknown, depth: number): boolean {
  if (!isRecord(value) || !Array.isArray(value.rows)) return false;
  return value.rows.every((row) => isRecord(row) && Array.isArray(row.cells) && row.cells.every((cell) => {
    const content = Array.isArray(cell) ? cell : isRecord(cell) && Array.isArray(cell.content) ? cell.content : undefined;
    if (!content || !content.every((item) => validateInline(item, depth + 1))) return false;
    return !isRecord(cell) || cell.props === undefined || validateJsonValue(cell.props, depth + 1);
  }));
}

function validateJsonValue(value: unknown, depth: number): boolean {
  if (depth > 24) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => validateJsonValue(item, depth + 1));
  return isRecord(value) && Object.entries(value).every(([key, item]) => !['__proto__', 'constructor', 'prototype'].includes(key) && validateJsonValue(item, depth + 1));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
