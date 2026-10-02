import assert from "node:assert/strict";
import test from "node:test";
import { createR2Storage } from "@/function/infrastructure/workers/r2-storage";
import storageWorker from "@/function/infrastructure/workers/storage-entry";

test("R2 ObjectStorage signs independent Storage Worker uploads", async () => {
  const writes: Array<{ key: string; body: string }> = [];
  const bucket = {
    get: async () => null,
    put: async (key: string, body: BodyInit | null) => {
      writes.push({ key, body: await new Response(body).text() });
      return { etag: "r2-etag" };
    },
    delete: async () => {},
    list: async () => ({ objects: [], truncated: false }),
  };
  const secret = "r2-upload-secret-with-at-least-32-characters";
  const storage = createR2Storage(bucket, { origin: "https://storage.example.test", secret });
  assert.ok(storage?.signPut);
  const target = await storage.signPut("assets/image.png", 60, { contentType: "image/png" });
  const response = await storageWorker.fetch(new Request(target.url, { method: "PUT", headers: { origin: "https://admin.example.test", ...target.headers }, body: "image" }), {
    STORAGE: bucket,
    STORAGE_UPLOAD_SECRET: secret,
    FUNCTION_ORIGINS: "https://admin.example.test",
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("etag"), "r2-etag");
  assert.deepEqual(writes, [{ key: "assets/image.png", body: "image" }]);
});

test("R2 Storage Worker rejects tampered upload targets", async () => {
  const bucket = { get: async () => null, put: async () => ({ etag: "unexpected" }), delete: async () => {}, list: async () => ({ objects: [], truncated: false }) };
  const secret = "r2-upload-secret-with-at-least-32-characters";
  const storage = createR2Storage(bucket, { origin: "https://storage.example.test", secret })!;
  const target = await storage.signPut!("safe.txt", 60);
  const url = new URL(target.url);
  url.searchParams.set("target", `${url.searchParams.get("target")}x`);
  const response = await storageWorker.fetch(new Request(url, { method: "PUT", body: "unsafe" }), { STORAGE: bucket, STORAGE_UPLOAD_SECRET: secret });
  assert.equal(response.status, 400);
});
