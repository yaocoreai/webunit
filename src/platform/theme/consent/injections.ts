import { getConsent, isConsentAllowed, subscribeConsent } from './browser';
import type { ConsentPurpose } from '@/platform/theme/render/model';

type PendingInjection = Readonly<{ id: string; code: string; requiredConsent: readonly ConsentPurpose[] }>;
const executed = new Set<string>();
let initialized = false;

function activateScript(source: HTMLScriptElement): HTMLScriptElement {
  const script = document.createElement('script');
  for (const attribute of source.attributes) script.setAttribute(attribute.name, attribute.value);
  script.textContent = source.textContent;
  return script;
}

function activateMarker(marker: HTMLScriptElement, injection: PendingInjection) {
  if (executed.has(injection.id)) { marker.remove(); return; }
  const template = document.createElement('template');
  template.innerHTML = injection.code;
  for (const source of [...template.content.querySelectorAll('script')]) source.replaceWith(activateScript(source));
  executed.add(injection.id);
  marker.replaceWith(template.content);
}

export function activateDocumentInjections(version: number, preview = false) {
  if (preview || typeof document === 'undefined') return;
  const activate = () => {
    const consent = getConsent(version);
    for (const marker of document.querySelectorAll<HTMLScriptElement>('script[data-cms-document-injection]')) {
      try {
        const injection = JSON.parse(marker.textContent ?? '') as PendingInjection;
        if (isConsentAllowed(injection.requiredConsent, consent)) activateMarker(marker, injection);
      } catch { marker.remove(); }
    }
  };
  activate();
  if (!initialized) { initialized = true; subscribeConsent(activate); }
}
