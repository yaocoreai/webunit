import assert from 'node:assert/strict';
import test from 'node:test';
import { isRichText, richTextToPlainText, safeRichTextEmbedUrl } from '@/platform/theme';
import type { RichTextNode } from '@/platform/theme';

test('RichText validates BlockNote JSON and creates plain text', () => {
  const value = [
    { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Typed content', styles: { bold: true } }], children: [] },
    { type: 'paragraph', props: {}, content: [{ type: 'link', href: '/features', content: [{ type: 'text', text: 'Open features', styles: {} }] }], children: [] },
    { type: 'codeBlock', props: { language: 'typescript' }, content: [{ type: 'text', text: 'const answer = 42', styles: {} }], children: [] },
  ] satisfies readonly RichTextNode[];

  assert.equal(isRichText(value), true);
  assert.equal(richTextToPlainText(value), 'Typed content Open features const answer = 42');
});

test('RichText validates table cells and includes their text in plain text output', () => {
  const value = [{
    type: 'table',
    props: {},
    content: { rows: [{ cells: [
      { content: [{ type: 'text', text: 'Product', styles: { bold: true } }], props: { header: true } },
      { content: [{ type: 'link', href: '/active', content: [{ type: 'text', text: 'Active', styles: {} }] }], props: {} },
    ] }] },
    children: [],
  }] satisfies readonly RichTextNode[];

  assert.equal(isRichText(value), true);
  assert.equal(richTextToPlainText(value), 'Product Active');
  assert.equal(isRichText([{ type: 'table', props: {}, content: { rows: [{ cells: [{ content: [{ type: 'link', href: 'javascript:alert(1)', content: [] }] }] }] }, children: [] }]), false);
});

test('RichText rejects unsafe links and old rich text trees', () => {
  assert.equal(isRichText([{ type: 'paragraph', props: {}, content: [{ type: 'link', href: 'javascript:alert(1)', content: [{ type: 'text', text: 'Unsafe', styles: {} }] }], children: [] }]), false);
  assert.equal(isRichText([{ type: 'paragraph', children: [{ text: 'old protocol' }] }]), false);
  assert.equal(isRichText([{ text: 'old leaf' }]), false);
});

test('RichText accepts a resolved CMS link that still has its reference key', () => {
  assert.equal(isRichText([{
    type: 'paragraph',
    props: {},
    content: [{
      type: 'link',
      href: '/about',
      referenceKey: 'link-1',
      target: '_blank',
      content: [{ type: 'text', text: 'About', styles: {} }],
    }],
    children: [],
  }]), true);
  assert.equal(isRichText([{
    type: 'paragraph',
    props: {},
    content: [{
      type: 'link',
      href: 'javascript:alert(1)',
      referenceKey: 'link-1',
      content: [{ type: 'text', text: 'About', styles: {} }],
    }],
    children: [],
  }]), false);
});

test('RichText accepts a file label stored as inline text', () => {
  const value = [{
    type: 'file',
    props: { url: 'https://example.com/report.pdf', name: 'Report' },
    content: [{ type: 'text', text: 'Download the report', styles: {} }],
    children: [],
  }] satisfies readonly RichTextNode[];
  assert.equal(isRichText(value), true);
  assert.equal(richTextToPlainText(value), 'Download the report');
  assert.equal(isRichText([{ type: 'image', props: { url: 'https://example.com/hero.jpg' }, content: [{ type: 'text', text: 'Hero', styles: {} }], children: [] }]), false);
});

test('RichText accepts structurally safe BlockNote extension blocks', () => {
  assert.equal(isRichText([{ type: 'product', props: { id: 'chair', compact: true }, content: [], children: [] }]), true);
  assert.equal(isRichText([{ type: '__proto__', props: {}, content: [] }]), false);
});

test('RichText embed URLs accept only the resolved URL for its trusted provider', () => {
  assert.equal(safeRichTextEmbedUrl('youtube', 'https://www.youtube-nocookie.com/embed/video_123'), 'https://www.youtube-nocookie.com/embed/video_123');
  assert.equal(safeRichTextEmbedUrl('youtube', 'https://evil.example/embed/video_123'), undefined);
  assert.equal(safeRichTextEmbedUrl('unknown', 'https://www.youtube-nocookie.com/embed/video_123'), undefined);
});
