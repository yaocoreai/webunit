const gatewayPrefix = '/_/';
const segmentPattern = /^[a-z][a-z0-9-]*$/;
const surfaces = new Set(["public", "user", "admin", "webhook", "internal"]);

export const routeNameToHttpPath = (name: string) => {
  if (!isRouteName(name)) throw new TypeError(`Invalid Route name: ${name}`);
  return `${gatewayPrefix}${name.replaceAll('.', '/')}`;
};

export function httpPathToRouteName(pathname: string): string | undefined {
  if (!pathname.startsWith(gatewayPrefix)) return undefined;
  const segments = pathname.slice(gatewayPrefix.length).split('/');
  if (
    segments.length < 4 ||
    segments.some((segment) => !segmentPattern.test(segment))
  ) return undefined;
  const name = segments.join('.');
  return isRouteName(name) ? name : undefined;
}

function isRouteName(name: string) {
  const segments = name.split(".");
  return segments.length >= 4 &&
    surfaces.has(segments[0] ?? "") &&
    segments.every((segment) => segmentPattern.test(segment));
}
