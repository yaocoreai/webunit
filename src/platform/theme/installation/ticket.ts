export type WebEditorPermission = "setting" | "preview";
export type WebEditorTicketVerificationInput = Readonly<{
  ticket: string;
  webOrigin: string;
  permission: WebEditorPermission;
}>;
export type WebEditorTicketVerifier = (
  input: WebEditorTicketVerificationInput,
  signal: AbortSignal,
) => Promise<unknown>;

const verifierKey = Symbol.for("webunit.platform.theme.web-editor-ticket-verifier");

export function bindWebEditorTicketVerifier(
  locals: object,
  verifier: WebEditorTicketVerifier,
): void {
  Object.defineProperty(locals, verifierKey, {
    configurable: false,
    enumerable: false,
    value: verifier,
    writable: false,
  });
}

export function useWebEditorTicketVerifier(locals: object): WebEditorTicketVerifier {
  const verifier = (locals as { [verifierKey]?: WebEditorTicketVerifier })[verifierKey];
  if (!verifier) throw new Error("Web Editor ticket verifier is not bound");
  return verifier;
}

export function readWebEditorTicket(
  request: Request,
  permission: WebEditorPermission,
  url = new URL(request.url),
): string | undefined {
  if (permission === "setting") {
    const authorization = request.headers.get("authorization");
    return authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim() || undefined
      : undefined;
  }
  const values = url.searchParams.getAll("ticket");
  return values.length === 1 ? values[0]?.trim() || undefined : undefined;
}

export async function verifyWebEditorTicket(
  request: Request,
  permission: WebEditorPermission,
  verifier: WebEditorTicketVerifier,
): Promise<boolean> {
  const url = new URL(request.url);
  const ticket = readWebEditorTicket(request, permission, url);
  if (!ticket) return false;
  const result = await verifier(
    { ticket, webOrigin: url.origin, permission },
    request.signal,
  );
  if (!result || typeof result !== "object" || Array.isArray(result)) return false;
  const data = result as Record<string, unknown>;
  return (
    data.valid === true &&
    data.webOrigin === url.origin &&
    data.permission === permission
  );
}
