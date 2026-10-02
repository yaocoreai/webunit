import assert from "node:assert/strict";
import test from "node:test";

import { createDataProtection } from "@/function/common/data-protection/service";

test("DataProtection round-trips without storing plaintext and binds purpose", async () => {
  const protector = createDataProtection("a-development-test-key-with-at-least-32-bytes")!;
  const protectedValue = await protector.protect("provider-api-key", "ai.provider-credential");
  assert.match(protectedValue, /^v1\./);
  assert.doesNotMatch(protectedValue, /provider-api-key/);
  assert.equal(await protector.reveal(protectedValue, "ai.provider-credential"), "provider-api-key");
  await assert.rejects(() => protector.reveal(protectedValue, "notifications.provider-token"));
  const wrongKey = createDataProtection("another-development-key-with-at-least-32-bytes")!;
  await assert.rejects(() => wrongKey.reveal(protectedValue, "ai.provider-credential"));
  assert.notEqual(await protector.digest("same", "contact.email-index"), await protector.digest("same", "analytics.integration-credential"));
});

test("DataProtection requires a strong runtime key", () => {
  assert.equal(createDataProtection(undefined), undefined);
  assert.throws(() => createDataProtection("short"), /at least 32 bytes/);
});
