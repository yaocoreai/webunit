import assert from "node:assert/strict";
import test from "node:test";
import { RateLimitDurableObjectCore } from "@/function/infrastructure/workers/rate-limit-core";

function createState() {
  const values = new Map<string, unknown>();
  let alarm: number | undefined;
  return {
    state: {
      storage: {
        get: async <T>(key: string) => values.get(key) as T | undefined,
        put: async <T>(key: string, value: T) => {
          values.set(key, value);
        },
        deleteAll: async () => {
          values.clear();
        },
        setAlarm: async (value: number | Date) => {
          alarm = Number(value);
        },
      },
    },
    values,
    alarm: () => alarm,
  };
}

test("Workers Rate Limit Durable Object owns one atomic window", async () => {
  const fixture = createState();
  const object = new RateLimitDurableObjectCore(fixture.state);
  const consume = () =>
    object
      .fetch(
        new Request("https://rate-limit.internal/consume", {
          method: "POST",
          body: JSON.stringify({ limit: 2, windowMs: 60_000 }),
        }),
      )
      .then(
        (response) =>
          response.json() as Promise<{ allowed: boolean; remaining: number }>,
      );
  assert.deepEqual(await consume(), {
    enabled: true,
    allowed: true,
    limit: 2,
    remaining: 1,
    resetAt: fixture.alarm(),
    retryAfterSeconds: 60,
  });
  assert.equal((await consume()).allowed, true);
  assert.equal((await consume()).allowed, false);
  assert.ok(fixture.alarm());
});
