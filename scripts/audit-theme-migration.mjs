import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const siteRoot = new URL('../', import.meta.url);
const sectionsUrl = new URL('src/theme/sections/', siteRoot);
const datasUrl = new URL('src/theme/datas/', siteRoot);
const defaultSource = '/Volumes/Workspace/dev/website/web-en/components/block';
const sourcePath = process.argv.find((value) => value.startsWith('--source='))?.slice('--source='.length) ?? defaultSource;

const toKebab = (name) => name.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/([A-Za-z])([0-9])/g, '$1-$2').toLowerCase();
const unique = (values) => new Set(values).size === values.length;

const visit = async (directory, suffixes) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
    if (entry.isDirectory()) files.push(...await visit(url, suffixes));
    else if (suffixes.some((suffix) => entry.name.endsWith(suffix))) files.push(url);
  }
  return files;
};

const failures = [];
const targetDirectories = (await readdir(sectionsUrl, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
if (!unique(targetDirectories)) failures.push('Theme Section directories contain duplicate keys');

for (const target of targetDirectories) {
  const settingUrl = new URL(`${target}/setting.ts`, sectionsUrl);
  const renderUrl = new URL(`${target}/render.astro`, sectionsUrl);
  const setting = await readFile(settingUrl, 'utf8').catch(() => '');
  const render = await readFile(renderUrl, 'utf8').catch(() => '');
  if (!setting) failures.push(`missing Section setting: ${target}`);
  else if (!/\bdefineSection\(/.test(setting)) failures.push(`Section does not use defineSection: ${target}`);
  if (!render) failures.push(`missing Section renderer: ${target}`);
  else if (!/\buseSection\b/.test(render)) failures.push(`Section does not use useSection: ${target}`);
}

for (const file of await visit(sectionsUrl, ['.ts', '.astro'])) {
  const content = await readFile(file, 'utf8');
  const relative = fileURLToPath(file).replace(fileURLToPath(siteRoot), '');
  if (/<style\b|\.s[ac]ss['"]|\b(?:NuxtLink|Swiper|Pinia|defineSectionSetting|defineThemeProperties)\b/.test(content)) {
    failures.push(`forbidden source implementation remains: ${relative}`);
  }
}

const datasText = (await Promise.all((await visit(datasUrl, ['.ts'])).map((file) => readFile(file, 'utf8')))).join('\n');
const datasKeys = new Set([...datasText.matchAll(/\bkey:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]));
if (/\bpreviewBannerSection\s*\(/.test(datasText)) datasKeys.add('banner');
for (const match of datasText.matchAll(/\bpreview([A-Z][A-Za-z0-9]*)Section\s*\(/g)) {
  datasKeys.add(toKebab(match[1]));
}
for (const target of targetDirectories) if (!datasKeys.has(target)) failures.push(`Section has no Datas instance: ${target}`);

const sourceEntries = await readdir(sourcePath, { withFileTypes: true }).catch((error) => error?.code === 'ENOENT' ? null : Promise.reject(error));
if (sourceEntries) {
  const sourceDirectories = sourceEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const sourceByKebab = new Map(sourceDirectories.map((name) => [toKebab(name), name]));
  for (const target of targetDirectories) {
    if (!sourceByKebab.has(target)) failures.push(`Section key is not the source Block kebab-case name: ${target}`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Theme migration audit passed (${targetDirectories.length} Sections${sourceEntries ? ', source names checked' : ''}).`);
}
