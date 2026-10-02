import type {
  OperationResult,
  RouteResponseEffects,
} from "@/function/common/app/entry";
import { serializeResponseCookie } from "@/platform/function/http/response-cookie";

export type DirectResponseEffectsHandler = (
  effects: RouteResponseEffects,
) => void;

export function unwrapDirectOperationResult(
  result: OperationResult,
  onResponseEffects?: DirectResponseEffectsHandler,
): unknown {
  if (result.type !== "data") return result;
  handleDirectResponseEffects(result, onResponseEffects);
  return result.data;
}

export function handleDirectResponseEffects(
  result: OperationResult,
  onResponseEffects?: DirectResponseEffectsHandler,
): void {
  if (result.type !== "data") return;
  if (result.response?.cookies?.length) {
    if (!onResponseEffects) {
      throw new Error(
        "Direct Function response effects require an adapter handler",
      );
    }
    onResponseEffects(result.response);
  }
}

export class FunctionResponseEffectCollector {
  readonly #requestUrl: URL;
  readonly #cookies: string[] = [];

  constructor(requestUrl: URL) {
    this.#requestUrl = requestUrl;
  }

  readonly capture = (effects: RouteResponseEffects) => {
    for (const cookie of effects.cookies ?? []) {
      this.#cookies.push(serializeResponseCookie(cookie, this.#requestUrl));
    }
  };

  apply(headers: Headers): void {
    for (const cookie of this.#cookies) headers.append("set-cookie", cookie);
  }
}
