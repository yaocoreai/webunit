import { readFile } from 'node:fs/promises';
import { findPropertyCall, parseTypescript } from './typescript-static.mjs';

export async function readSourceProvider(sourceIndex) {
  const source = await readFile(sourceIndex, 'utf8');
  const providers = findPropertyCall(parseTypescript(source, sourceIndex.pathname ?? String(sourceIndex)), 'contents')
    .flatMap((name) => name === 'datasContents' ? ['datas'] : name === 'functionContents' ? ['function'] : []);
  if (providers.length !== 1) throw new Error('Content source entry must select exactly one datasContents() or functionContents() provider');
  return providers[0];
}
