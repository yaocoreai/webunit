import type { DeploymentKind } from './identity';

export type RuntimeName = DeploymentKind;
export type RequestContextSource = 'none' | 'proxy' | 'cloudflare' | 'geoip';
export type CapabilityLevel = 'none' | 'basic' | 'full';
export type RequestClientContext = Readonly<{ runtime: RuntimeName; contextSource: RequestContextSource; capabilityLevel: CapabilityLevel; ipAddress?: string; userAgent?: string }>;
export type RequestTransport = Readonly<{ edgeColo?: string; httpProtocol?: string; tlsVersion?: string }>;
export type RequestGeo = Readonly<{ contextSource: 'proxy' | 'cloudflare' | 'geoip'; capabilityLevel: 'basic' | 'full'; countryCode?: string; regionCode?: string; regionName?: string; city?: string; timezone?: string; asn?: number; asOrganization?: string }>;
export type RequestBot = Readonly<{ source: 'cloudflare' | 'heuristic'; capabilityLevel: 'basic' | 'full'; botScore?: number; threatScore?: number; isVerifiedBot?: boolean; verifiedBotCategory?: string; staticResource?: boolean; jsDetectionPassed?: boolean }>;
export type RequestSignals = Readonly<{ requestContext: RequestClientContext; transport?: RequestTransport; geo?: RequestGeo; bot?: RequestBot }>;

type Cf = Record<string, unknown>;
const record = (value: unknown): Cf | undefined => value && typeof value === 'object' ? value as Cf : undefined;
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;
const integer = (value: unknown) => typeof value === 'number' && Number.isInteger(value) ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : undefined;
const country = (value: unknown) => { const result = text(value)?.toUpperCase(); return result && /^[A-Z]{2}$/.test(result) ? result : undefined; };

export function createRequestSignalsResolver(request: Request, runtime: RuntimeName, trustProxy = false) {
  const cf = runtime === 'workers' ? record((request as Request & { cf?: unknown }).cf) : undefined;
  let requestContext: RequestClientContext | undefined; let transport: RequestTransport | undefined;
  let geo: Promise<RequestGeo | undefined> | undefined; let bot: Promise<RequestBot | undefined> | undefined; let signals: Promise<RequestSignals> | undefined;
  const context = () => requestContext ??= (() => {
    const ipAddress = cf ? text(request.headers.get('cf-connecting-ip')) : trustProxy ? text(request.headers.get('x-forwarded-for'))?.split(',')[0]?.trim() || text(request.headers.get('x-real-ip')) : undefined;
    const userAgent = text(request.headers.get('user-agent'));
    const contextSource = cf ? 'cloudflare' : ipAddress || userAgent ? trustProxy || runtime === 'node' ? 'proxy' : 'none' : 'none';
    return { runtime, contextSource, capabilityLevel: cf ? 'full' : contextSource === 'none' ? 'none' : 'basic', ...(ipAddress ? { ipAddress } : {}), ...(userAgent ? { userAgent } : {}) };
  })();
  const readTransport = () => transport ??= (() => { const value = { edgeColo: text(cf?.colo), httpProtocol: text(cf?.httpProtocol), tlsVersion: text(cf?.tlsVersion) }; return Object.values(value).some(Boolean) ? value : {}; })();
  const readGeo = () => geo ??= Promise.resolve((() => {
    const source = cf ? 'cloudflare' as const : trustProxy ? 'proxy' as const : undefined; if (!source) return undefined;
    const value = { contextSource: source, capabilityLevel: cf ? 'full' as const : 'basic' as const, countryCode: country(cf?.country ?? request.headers.get('cf-ipcountry')), regionCode: text(cf?.regionCode), regionName: text(cf?.region), city: text(cf?.city), timezone: text(cf?.timezone), asn: integer(cf?.asn), asOrganization: text(cf?.asOrganization) };
    return Object.values(value).slice(2).some((item) => item !== undefined) ? value : undefined;
  })());
  const readBot = () => bot ??= Promise.resolve((() => {
    const cfBot = record(cf?.botManagement); if (cfBot) { const jsDetection = record(cfBot.jsDetection); return { source: 'cloudflare' as const, capabilityLevel: 'full' as const, botScore: integer(cfBot.score), isVerifiedBot: typeof cfBot.verifiedBot === 'boolean' ? cfBot.verifiedBot : undefined, verifiedBotCategory: text(cf?.verifiedBotCategory), staticResource: typeof cfBot.staticResource === 'boolean' ? cfBot.staticResource : undefined, jsDetectionPassed: typeof jsDetection?.passed === 'boolean' ? jsDetection.passed : undefined }; }
    const ua = context().userAgent?.toLowerCase(); if (!ua) return undefined; const detected = /\b(bot|crawler|spider|slurp|bingpreview)\b/.test(ua); return { source: 'heuristic' as const, capabilityLevel: 'basic' as const, isVerifiedBot: false, botScore: detected ? 1 : 99 };
  })());
  const readSignals = () => signals ??= Promise.all([readGeo(), readBot()]).then(([geoValue, botValue]) => ({ requestContext: context(), ...(Object.keys(readTransport()).length ? { transport: readTransport() } : {}), ...(geoValue ? { geo: geoValue } : {}), ...(botValue ? { bot: botValue } : {}) }));
  return { request: context, transport: readTransport, geo: readGeo, bot: readBot, signals: readSignals } as const;
}
export type RequestSignalsResolver = ReturnType<typeof createRequestSignalsResolver>;
