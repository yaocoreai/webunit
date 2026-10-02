import assert from "node:assert/strict";

if (process.env.RUNTIME_BUSINESS_WRITE_TESTS !== "true")
  throw new Error(
    "RUNTIME_BUSINESS_WRITE_TESTS=true is required for the write smoke",
  );

const baseUrl = required("SMOKE_BASE_URL").replace(/\/$/, "");
const topology = process.env.SMOKE_TOPOLOGY?.trim() || "unknown";
const account = required("SMOKE_ADMIN_ACCOUNT");
const password = required("SMOKE_ADMIN_PASSWORD");
const runId = crypto.randomUUID();
const siteHost = `runtime-${runId}.invalid`;
const content = new TextEncoder().encode(`webunit-runtime-${runId}`);
let cookie;
let site;
let storageObjectKey;

try {
  const installation = await call("public.installation.status.read", {});
  if (!installation.installed) {
    if (process.env.SMOKE_ALLOW_INSTALL !== "true")
      throw new Error(
        `${topology} is not installed; SMOKE_ALLOW_INSTALL=true is required`,
      );
    await call("public.installation.setup.create", {
      account,
      name: "Runtime Smoke Administrator",
      password,
      siteName: "Runtime Smoke Baseline",
      defaultLocale: "en",
      defaultCurrency: "usd",
      siteHost: `baseline-${runId}.invalid`,
    });
  }

  cookie = await login();
  const authenticated = await call(
    "public.authentication.session.read",
    {},
    { cookie },
  );
  assert.equal(authenticated.user.account, account);

  const existingSites = await call("admin.cms.site.list", {}, { cookie });
  if (existingSites.items.length === 0) {
    await call(
      "admin.cms.site.create",
      {
        remark: "Runtime Smoke Baseline",
        defaultLocale: "en",
        supportedLocales: ["en"],
        defaultCurrency: "usd",
        domains: [
          {
            host: `baseline-${runId}.invalid`,
            canonicalPolicy: "independent",
          },
        ],
        idempotencyKey: `runtime-smoke-baseline-${runId}`,
      },
      { cookie },
    );
  }

  site = await call(
    "admin.cms.site.create",
    {
      remark: `Runtime Smoke ${runId}`,
      defaultLocale: "en",
      supportedLocales: ["en"],
      defaultCurrency: "usd",
      domains: [{ host: siteHost, canonicalPolicy: "independent" }],
      idempotencyKey: `runtime-smoke-site-${runId}`,
    },
    { cookie },
  );
  assert.equal(site.domains?.[0]?.host, siteHost);
  const readSite = await call(
    "admin.cms.site.read",
    { siteId: site.id },
    { cookie },
  );
  assert.equal(readSite.id, site.id);

  const sources = await call(
    "admin.cms.asset.source.list",
    { siteId: site.id },
    { cookie },
  );
  const source = sources.find(
    (value) => value.capabilities?.uploadResource === true,
  );
  assert.ok(source, "CMS Site did not install an upload-capable Asset source");
  const ticket = await call(
    "admin.cms.asset.upload-ticket.issue",
    {
      sourceId: source.id,
      pathPrefix: `runtime-smoke/${runId}`,
      maxFileSize: content.byteLength,
      allowedMimeTypes: ["text/plain"],
      allowedExtensions: ["txt"],
      visibility: "public",
    },
    { cookie },
  );
  const logicalPath = `runtime-smoke/${runId}/probe.txt`;
  const upload = await call("public.storage.upload.create", {
    ticket: ticket.token,
    storageKey: source.config.storageKey,
    mountKey: source.config.mountKey,
    logicalPath,
    deliveryPath: logicalPath,
    visibility: "public",
    assetType: "binary",
    contentType: "text/plain",
    sizeBytes: content.byteLength,
    uploadMode: "single",
  });
  assert.equal(upload.upload.mode, "single");
  const uploadResponse = await fetch(upload.upload.url, {
    method: "PUT",
    headers: upload.upload.headers,
    body: content,
  });
  assert.ok(
    uploadResponse.ok,
    `Storage upload failed: ${uploadResponse.status} ${await uploadResponse.text()}`,
  );
  const completed = await call("public.storage.upload.complete", {
    id: upload.id,
    sessionKey: upload.sessionKey,
  });
  storageObjectKey = completed.objectKey;
  assert.equal(completed.deliveryPath, logicalPath);
  const read = await fetch(
    `${baseUrl}/_/public/storage/${logicalPath.split("/").map(encodeURIComponent).join("/")}`,
  );
  assert.equal(read.status, 200);
  assert.equal(await read.text(), new TextDecoder().decode(content));
  await call(
    "admin.storage.object.delete",
    { objectKey: storageObjectKey },
    { cookie },
  );
  storageObjectKey = undefined;

  const cycle = await call("admin.job.once.run", {}, { cookie });
  for (const key of [
    "schedulesClaimed",
    "eventsRecovered",
    "queueRecovered",
  ]) assert.equal(typeof cycle[key], "number", `Invalid Background result: ${key}`);

  const deletion = await call(
    "admin.cms.site.delete",
    {
      siteId: site.id,
      expectedRevision: site.revision,
      idempotencyKey: `runtime-smoke-delete-${runId}`,
    },
    { cookie },
  );
  const completedDeletion = await waitForDeletion(deletion.id);
  assert.equal(completedDeletion.status, "completed");
  site = undefined;

  console.info(
    JSON.stringify({
      event: "runtime_business_smoke_completed",
      topology,
      installation: "ready",
      login: "completed",
      cms: "create-read-delete",
      storage: "upload-read-delete",
      background: "cycle-and-site-deletion",
    }),
  );
} finally {
  if (storageObjectKey && cookie)
    await call(
      "admin.storage.object.delete",
      { objectKey: storageObjectKey },
      { cookie },
    ).catch(() => undefined);
  if (site && cookie)
    await call(
      "admin.cms.site.delete",
      {
        siteId: site.id,
        expectedRevision: site.revision,
        idempotencyKey: `runtime-smoke-cleanup-${runId}`,
      },
      { cookie },
    ).catch(() => undefined);
  if (cookie)
    await call(
      "public.authentication.session.delete",
      {},
      { cookie },
    ).catch(() => undefined);
}

async function login() {
  const operationId = crypto.randomUUID();
  const challenge = await call("public.verification.challenge.issue", {
    scene: "admin-login",
    method: "slider-only",
    operationId,
  });
  const profile = challenge.sliderOnly;
  const points = [[0, 0]];
  const steps = [7, 11, 17, 9, 15, 8, 13, 19, 10, 16, 12, 18];
  let x = 0;
  for (let index = 0; points.length < Math.max(profile.minTrailPoints, 10) || x < profile.minDistance + 20; index += 1) {
    x += steps[index % steps.length];
    points.push([x, index % 3]);
  }
  const duration = profile.minDurationMs + 100;
  await wait(duration + 25);
  const verification = await call("public.verification.challenge.verify", {
    challengeId: challenge.challengeId,
    method: "slider-only",
    duration,
    responseX: x,
    responseY: 0,
    targetType: "slider",
    trail: points,
  });
  const response = await request("public.authentication.session.create", {
    identifier: account,
    password,
    verificationTicket: verification.ticket,
  });
  const value = response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(value, "Login response did not set an Admin session cookie");
  return value;
}

async function waitForDeletion(id) {
  const deadline = Date.now() + Number(process.env.SMOKE_BUSINESS_TIMEOUT_MS ?? 60_000);
  let current;
  while (Date.now() < deadline) {
    current = await call(
      "admin.cms.site-deletion.read",
      { deletionId: id },
      { cookie },
    );
    if (["completed", "failed", "cancelled"].includes(current.status))
      return current;
    await call("admin.job.once.run", {}, { cookie });
    await wait(250);
  }
  throw new Error(`CMS Site deletion timed out at ${current?.currentStep ?? "unknown"}`);
}

async function call(name, input, headers) {
  const response = await request(name, input, headers);
  return (await response.json()).data;
}

async function request(name, input, headers = {}) {
  const response = await fetch(
    `${baseUrl}/_/${name.replaceAll(".", "/")}`,
    {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok)
    throw new Error(
      `${name}: ${response.status} ${await response.text()}`,
    );
  return response;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function wait(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}
