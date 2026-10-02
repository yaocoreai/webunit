import assert from "node:assert/strict";
import test from "node:test";

import { createOpaqueToken, digestOpaqueToken } from "@/function/common/authentication/opaque-token";
import { hashPassword, verifyPassword } from "@/function/common/authentication/password";
import {
  createSignedToken,
  peekUnverifiedTokenPayload,
  readSignedToken,
} from "@/function/common/authentication/session-token";

test("password hashing verifies the correct password and rejects a wrong one", async () => {
  const credential = await hashPassword("correct-password", 100_000);
  assert.equal(credential.iterations, 100_000);
  assert.ok(await verifyPassword("correct-password", credential));
  assert.equal(await verifyPassword("wrong-password", credential), false);
});

test("password hashing produces a different salt (and hash) for the same password", async () => {
  const first = await hashPassword("same-password", 100_000);
  const second = await hashPassword("same-password", 100_000);
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.ok(await verifyPassword("same-password", first));
  assert.ok(await verifyPassword("same-password", second));
});

test("session token round-trips its payload and rejects a tampered signature", async () => {
  const token = await createSignedToken({ id: "session-1", customerId: "customer-1" }, "secret-a");
  const payload = await readSignedToken<{ id: string; customerId: string }>(token, "secret-a");
  assert.deepEqual(payload, { id: "session-1", customerId: "customer-1" });

  assert.equal(await readSignedToken(token, "secret-b"), undefined);
  assert.equal(await readSignedToken(`${token}tampered`, "secret-a"), undefined);
  assert.equal(await readSignedToken(undefined, "secret-a"), undefined);
});

test("peekUnverifiedTokenPayload reads the payload without checking the signature", async () => {
  const token = await createSignedToken({ customerId: "customer-1" }, "secret-a");
  assert.deepEqual(peekUnverifiedTokenPayload<{ customerId: string }>(token), { customerId: "customer-1" });
  // Even a token signed with a different secret still decodes — the caller
  // is expected to re-verify with `readSignedToken` before trusting it.
  const otherToken = await createSignedToken({ customerId: "customer-2" }, "secret-b");
  assert.deepEqual(peekUnverifiedTokenPayload<{ customerId: string }>(otherToken), { customerId: "customer-2" });
});

test("opaque tokens are high-entropy and digest deterministically for lookup", async () => {
  const first = createOpaqueToken();
  const second = createOpaqueToken();
  assert.notEqual(first, second);
  const digest = await digestOpaqueToken(first);
  assert.equal(await digestOpaqueToken(first), digest);
  assert.notEqual(await digestOpaqueToken(second), digest);
});
