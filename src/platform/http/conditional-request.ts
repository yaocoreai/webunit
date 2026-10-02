type RepresentationValidators = Readonly<{
  etag?: string;
  lastModified?: string;
}>;

/** Evaluate GET/HEAD cache validators with If-None-Match precedence and weak ETag comparison. */
export function isNotModified(request: Request, validators: RepresentationValidators) {
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch !== null) {
    if (ifNoneMatch.match(/\*|(?:W\/)?"[^"]*"/g)?.includes('*')) return true;
    if (!validators.etag) return false;
    const current = weakEtag(validators.etag);
    return ifNoneMatch.match(/(?:W\/)?"[^"]*"/g)?.some((candidate) => weakEtag(candidate) === current) ?? false;
  }
  const since = Date.parse(request.headers.get('if-modified-since') ?? '');
  const modified = Date.parse(validators.lastModified ?? '');
  return Number.isFinite(since) && Number.isFinite(modified) && modified <= since;
}

const weakEtag = (value: string) => value.trim().replace(/^W\//, '');
