import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFilesystemStorage } from "@/function/infrastructure/server/filesystem-storage";

test("filesystem Storage implements the cross-runtime object contract", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "webunit-storage-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const storage = createFilesystemStorage(root);

  const created = await storage.put("images/example.txt", "hello", {
    contentType: "text/plain",
  });
  assert.match(created.etag ?? "", /^[a-f0-9]{64}$/);

  const object = await storage.get("images/example.txt");
  assert.equal(object?.contentType, "text/plain");
  assert.equal(object?.size, 5);
  assert.equal(await new Response(object?.body).text(), "hello");

  assert.deepEqual(
    (await storage.list({ prefix: "images/" })).objects.map(({ key }) => key),
    ["images/example.txt"],
  );
  await storage.delete("images/example.txt");
  assert.equal(await storage.get("images/example.txt"), null);
});

test("filesystem Storage completes multipart content without exposing temporary parts", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "webunit-storage-multipart-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const storage = createFilesystemStorage(root);
  assert.ok(
    storage.createMultipart && storage.uploadPart && storage.completeMultipart,
  );
  const { uploadId } = await storage.createMultipart("videos/example.bin", {
    contentType: "application/octet-stream",
  });
  const first = await storage.uploadPart(
    "videos/example.bin",
    uploadId,
    1,
    new Blob(["hello "]),
  );
  const second = await storage.uploadPart(
    "videos/example.bin",
    uploadId,
    2,
    new Blob(["world"]),
  );
  await storage.completeMultipart("videos/example.bin", uploadId, [
    { partNumber: 1, etag: first.etag },
    { partNumber: 2, etag: second.etag },
  ]);
  const object = await storage.get("videos/example.bin");
  assert.equal(await new Response(object?.body).text(), "hello world");
  assert.match(object?.checksumSha256 ?? "", /^[a-f0-9]{64}$/);
  assert.deepEqual(
    (await storage.list()).objects.map(({ key }) => key),
    ["videos/example.bin"],
  );
});

test("filesystem Storage rejects escaping and ambiguous keys", async () => {
  const storage = createFilesystemStorage(
    join(tmpdir(), "webunit-storage-invalid"),
  );
  await assert.rejects(
    () => storage.put("../secret", "value"),
    /Invalid storage key/,
  );
  await assert.rejects(
    () => storage.put("nested//secret", "value"),
    /Invalid storage key/,
  );
});
