import type { RouteContext } from "./definition";

const authenticatedRequestStateKey = "function.route.authenticated";

export function markRouteAuthenticated(context: RouteContext): void {
  context.requestState.set(authenticatedRequestStateKey, true);
}

export function isRouteAuthenticated(
  state: ReadonlyMap<string, unknown>,
): boolean {
  return state.get(authenticatedRequestStateKey) === true;
}
