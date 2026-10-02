import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { readSourceProvider } from "./source-provider.mjs";

const root = resolve(import.meta.dirname, "../dist/workers");
const server = resolve(root, "server");
const client = resolve(root, "client");
const failures = [];
const attributionPath = resolve(import.meta.dirname, '../.wrangler/reports/bundle-attribution.json');
const attribution = JSON.parse(await readFile(attributionPath, 'utf8'));
const serverAttribution = attribution.builds.find((build) => build.environment === 'ssr');
const clientAttribution = attribution.builds.find((build) => build.environment === 'client');
if (!serverAttribution || !clientAttribution) failures.push('Vite bundle attribution is incomplete');

const visit = async (directory) =>
  (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map((entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? visit(path) : [path];
      }),
    )
  ).flat();

const serverFiles = await visit(server);
const serverModules = serverFiles.filter((path) => /\.(?:js|mjs)$/.test(path));
const provider = await readSourceProvider(
  resolve(import.meta.dirname, "../src/platform/composition/source.ts"),
);
const deployment = JSON.parse(
  await readFile(resolve(root, "deployment.json"), "utf8"),
);
if (deployment.renderer !== "theme" && deployment.renderer !== "web") {
  failures.push("Workers deployment manifest must select theme or web");
}
if (deployment.deployment !== "workers" || deployment.sourceProvider !== provider)
  failures.push("Workers deployment manifest does not match the build");
const sizes = new Map(
  await Promise.all(
    serverModules.map(async (path) => [path, (await stat(path)).size]),
  ),
);
const moduleSources = new Map(
  await Promise.all(
    serverModules.map(async (path) => [path, await readFile(path)]),
  ),
);
const gzipSizes = new Map(
  [...moduleSources].map(([path, source]) => [
    path,
    gzipSync(source).byteLength,
  ]),
);
const totalServerBytes = [...sizes.values()].reduce(
  (total, size) => total + size,
  0,
);
const totalServerGzipBytes = [...gzipSizes.values()].reduce(
  (total, size) => total + size,
  0,
);
const entry = resolve(server, "entry.mjs");
const staticGraph = new Map();

for (const file of serverModules) {
  const source = moduleSources.get(file).toString("utf8");
  const dependencies = [];
  for (const match of source.matchAll(
    /^import(?:[\s\S]*?from\s*)?["']([^"']+)["'];?$/gm,
  )) {
    if (!match[1].startsWith(".")) continue;
    const dependency = resolve(dirname(file), match[1]);
    if (sizes.has(dependency)) dependencies.push(dependency);
  }
  staticGraph.set(file, dependencies);
  if (
    /(?:from\s*["']node:|import\s*\(\s*["']node:|better-sqlite|@duckdb\/node-api|@maxmind\/geoip2-node|\bbullmq\b|\bioredis\b|@aws-sdk\/client-s3|\bdrizzle-orm\b|\bpg-native\b|\bsharp\b)/.test(
      source,
    )
  ) {
    failures.push(
      `Node-only dependency in Workers module: ${relative(server, file)}`,
    );
  }
}

const serverSource = [...moduleSources.values()].join("\n");
for (const marker of [
  "createFileCache",
  "createRedisCache",
  "WEB_DATA_DIR",
  "WEB_CACHE_REDIS_URL",
  "WEB_CACHE_REDIS_MAX_CONNECTIONS",
  "WEB_CACHE_REDIS_TIMEOUT_MS",
  "WEB_CACHE_REDIS_MAXMEMORY",
  "FUNCTION_CACHE_DIR",
  "FUNCTION_CACHE_REDIS_URL",
  "FUNCTION_CACHE_REDIS_MAXMEMORY",
]) {
  if (serverSource.includes(marker))
    failures.push(
      `Node-only Web Cache contract entered Workers server: ${marker}`,
    );
}
if (provider === "datas" && /createCmsFunctionContentSource/.test(serverSource))
  failures.push("Service ContentSource entered a Datas build");
if (provider === "function" && /createDatasContentSource/.test(serverSource))
  failures.push("Datas ContentSource entered a Service build");
if (provider === "datas" && /readThemeSetting/.test(serverSource))
  failures.push("Theme interface entered a Datas build");

const coldModules = new Set();
const collectStatic = (file, output) => {
  if (output.has(file)) return;
  output.add(file);
  for (const dependency of staticGraph.get(file) ?? [])
    collectStatic(dependency, output);
};
collectStatic(entry, coldModules);
const coldBytes = [...coldModules].reduce(
  (total, file) => total + (sizes.get(file) ?? 0),
  0,
);
const coldGzipBytes = [...coldModules].reduce(
  (total, file) => total + (gzipSizes.get(file) ?? 0),
  0,
);

const workerEntry = serverModules.find((path) =>
  /\/chunks\/worker-entry_[^/]+\.mjs$/.test(path),
);
if (!workerEntry) failures.push("Workers entry chunk is missing");
const workerSource = workerEntry ? await readFile(workerEntry, "utf8") : "";
for (const marker of ["functionRuntime", "consumeQueue", "runScheduled"]) {
  if (!serverSource.includes(marker))
    failures.push(`Unified Worker entry is missing ${marker}`);
}
const editorRoutes = ["_preview_", "_setting_"].filter((route) =>
  new RegExp(`=> import\\(["']\\./${route}`).test(workerSource),
);
if (provider === "datas" && editorRoutes.length)
  failures.push("Theme Editor routes entered a Datas build");
if (deployment.editorEnabled !== (deployment.renderer === "theme" && editorRoutes.length === 2))
  failures.push("Theme Editor routes do not match the deployment manifest");
if (deployment.renderer === "web" && editorRoutes.length)
  failures.push("Theme Editor routes entered a Web renderer build");
if (deployment.storageOwner !== (provider === "datas" ? "web" : "function"))
  failures.push("Storage owner does not match the ContentSource");
for (const route of editorRoutes) {
  if (!new RegExp(`=> import\\(["']\\./${route}`).test(workerSource))
    failures.push(`Route is not lazy: /${route}`);
}
for (const marker of ["source_", "theme_", "vercel-ai-sdk_"]) {
  if (
    [...coldModules].some((path) =>
      relative(server, path).includes(`/chunks/${marker}`),
    )
  )
    failures.push(
      `${marker.slice(0, -1)} implementation entered the cold-start closure`,
    );
}

const clientFiles = await visit(client);
const clientFileSizes = new Map(
  await Promise.all(
    clientFiles.map(async (path) => [path, (await stat(path)).size]),
  ),
);
if (clientFiles.length > 20_000)
  failures.push(
    `Workers Static Assets exceed the Free-plan limit of 20000 files: ${clientFiles.length}`,
  );
for (const [path, size] of clientFileSizes) {
  if (size > 25 * 1024 * 1024)
    failures.push(
      `Workers Static Asset exceeds 25 MiB: ${relative(client, path)} ${size}`,
    );
}
const cssFiles = clientFiles.filter((path) => path.endsWith(".css"));
const browserJsFiles = clientFiles.filter((path) => /\.(?:js|mjs)$/.test(path));
const browserJsSources = await Promise.all(
  browserJsFiles.map((path) => readFile(path)),
);
const browserSource = browserJsSources.join("\n");
const browserJsBytes = browserJsSources.reduce(
  (total, value) => total + value.byteLength,
  0,
);
const browserJsGzipBytes = browserJsSources.reduce(
  (total, value) => total + gzipSync(value).byteLength,
  0,
);
for (const serverOnlyName of [
  "CMS_API_ORIGIN",
  "CMS_ADMIN_ORIGIN",
  "THEME_INTERFACE_KEY",
  "WEB_DATA_DIR",
  "WEB_CACHE_REDIS_URL",
  "WEB_CACHE_REDIS_MAX_CONNECTIONS",
  "WEB_CACHE_REDIS_TIMEOUT_MS",
  "WEB_CACHE_REDIS_MAXMEMORY",
  "FUNCTION_CACHE_DIR",
  "FUNCTION_CACHE_REDIS_URL",
  "FUNCTION_CACHE_REDIS_MAXMEMORY",
  "AI_API_BASE_URL",
  "AI_API_KEY",
  "AI_MODEL",
  "AI_PROVIDER_NAME",
  "FUNCTION_DATA_PROTECTION_KEY",
  "TRANSLATION_API_BASE_URL",
  "TRANSLATION_API_KEY",
  "TRANSLATION_MODEL",
]) {
  if (browserSource.includes(serverOnlyName))
    failures.push(
      `Server-only environment contract entered browser assets: ${serverOnlyName}`,
    );
}
if (
  provider === "function" &&
  clientFiles.some((path) => relative(client, path).startsWith("storage/"))
) {
  failures.push("Datas storage entered a Service build");
}
const browserDatasModules = (clientAttribution?.chunks ?? []).flatMap((chunk) =>
  chunk.modules.filter((module) => module.id.startsWith('src/theme/datas/')).map((module) => `${chunk.fileName}:${module.id}`),
);
if (provider === 'function' && browserDatasModules.length) failures.push(`Theme Datas entered production browser assets: ${browserDatasModules.join(', ')}`);
const attributedModuleIds = [serverAttribution, clientAttribution]
  .flatMap((build) => build?.chunks ?? [])
  .flatMap((chunk) => chunk.modules.map((module) => module.id));
if (deployment.renderer === 'web') {
  const unexpected = attributedModuleIds.filter((id) =>
    id.startsWith('src/theme/')
    || id.startsWith('src/platform/theme/')
    || id.startsWith('src/platform/generated/theme/'));
  if (unexpected.length) failures.push(`Theme modules entered Web renderer build: ${[...new Set(unexpected)].join(', ')}`);
} else {
  const unexpected = attributedModuleIds.filter((id) =>
    id.startsWith('src/web/') || id.startsWith('src/platform/web/'));
  if (unexpected.length) failures.push(`Web modules entered Theme renderer build: ${[...new Set(unexpected)].join(', ')}`);
}
const cssBytes = (await Promise.all(cssFiles.map((path) => stat(path)))).reduce(
  (total, value) => total + value.size,
  0,
);
const cssGzipBytes = (
  await Promise.all(cssFiles.map((path) => readFile(path)))
).reduce((total, value) => total + gzipSync(value).byteLength, 0);
if (cssFiles.length > 2)
  failures.push(
    `Workers client CSS must stay consolidated, found ${cssFiles.length} assets`,
  );
// Datas 构建发布完整的可复用 Theme 目录。CSS 保持为单个可缓存资源，交互式
// Section 则保持为由所属页面加载的独立浏览器 Chunk。
if (cssBytes > 160_000)
  failures.push(`Workers client CSS exceeds 160000 bytes: ${cssBytes}`);
// 浏览器控制器生成独立的带哈希资源，不嵌入 Worker Manifest。这里统计的是部署
// 并集而非单页负载；各 Owner Chunk 仍由下面的 Route/Section 边界约束。
if (browserJsBytes > 120_000 || browserJsGzipBytes > 55_000)
  failures.push(
    `Workers browser JS deployment union exceeds 120000 raw or 55000 gzip bytes: ${browserJsBytes} raw ${browserJsGzipBytes} gzip`,
  );
const largestBrowserChunk = browserJsFiles.map((path, index) => ({
  path,
  raw: browserJsSources[index].byteLength,
  gzip: gzipSync(browserJsSources[index]).byteLength,
})).sort((left, right) => right.gzip - left.gzip)[0];
if (largestBrowserChunk && (largestBrowserChunk.raw > 40_000 || largestBrowserChunk.gzip > 15_000))
  failures.push(`Workers browser chunk exceeds 40000 raw or 15000 gzip bytes: ${relative(client, largestBrowserChunk.path)} ${largestBrowserChunk.raw} raw ${largestBrowserChunk.gzip} gzip`);
// 同一个 Worker 必须导出两个 SQLite Durable Object 类，其 Handler 属于不可避免的
// 冷入口代码；所有可选能力客户端继续保持动态加载。Astro 6.4、两个必需的
// Durable Object 导出与生成的 Route Manifest 构成当前入口基线。可选能力客户端
// 与 Theme Renderer 必须保持懒加载，下面的 Cloudflare 全量压缩限制仍是部署硬边界。
if ((sizes.get(workerEntry) ?? Infinity) > 420_000)
  failures.push(
    `Workers entry chunk exceeds 420000 bytes: ${sizes.get(workerEntry)}`,
  );
if (coldBytes > 700_000)
  failures.push(
    `Workers cold-start closure exceeds 700000 bytes: ${coldBytes}`,
  );
if (coldGzipBytes > 160_000)
  failures.push(
    `Workers cold-start closure exceeds 160000 gzip bytes: ${coldGzipBytes}`,
  );
// 可选能力客户端保持按需加载。项目预算按当前完整基线留约 5% 回归空间，
// 同时远低于 3 MB 硬限制。
const projectServerGzipBudget = 1_280_000;
if (totalServerGzipBytes > projectServerGzipBudget)
  failures.push(
    `Workers project server budget exceeds ${projectServerGzipBudget} gzip bytes: ${totalServerGzipBytes}`,
  );
if (totalServerBytes > 64_000_000)
  failures.push(
    `Workers uncompressed script exceeds 64 MB: ${totalServerBytes}`,
  );
if (totalServerGzipBytes > 3_000_000)
  failures.push(
    `Workers compressed script exceeds the Free-plan limit of 3 MB: ${totalServerGzipBytes}`,
  );
const aiChunk = [...sizes].find(([path]) =>
  /\/chunks\/vercel-ai-sdk_[^/]+\.mjs$/.test(path),
);
if (
  aiChunk &&
  (aiChunk[1] > 640_000 || (gzipSizes.get(aiChunk[0]) ?? 0) > 130_000)
) {
  failures.push(
    `Vercel AI SDK lazy chunk exceeds 640000 raw or 130000 gzip bytes: ${aiChunk[1]} raw ${gzipSizes.get(aiChunk[0]) ?? 0} gzip`,
  );
}
const largestProjectChunk = [...sizes]
  .filter(
    ([path]) =>
      !/worker-entry_|params-and-props_|image-passthrough-endpoint_|vercel-ai-sdk_/.test(
        path,
      ),
  )
  .sort((left, right) => right[1] - left[1])[0];
if (
  largestProjectChunk?.[1] > 512_000 ||
  (gzipSizes.get(largestProjectChunk?.[0]) ?? 0) > 150_000
) {
  failures.push(
    `Largest project chunk exceeds 512000 raw or 150000 gzip bytes: ${relative(server, largestProjectChunk[0])} ${largestProjectChunk[1]} raw ${gzipSizes.get(largestProjectChunk[0]) ?? 0} gzip`,
  );
}
const routeCatalogModule = (serverAttribution?.chunks ?? [])
  .flatMap((chunk) => chunk.modules ?? [])
  .find((module) => module.id.endsWith('src/function/bootstrap/generated/route/manifest.ts'));
if (!routeCatalogModule || routeCatalogModule.renderedLength > 32_000) {
  failures.push(`Lightweight Route catalog exceeds 32000 rendered bytes: ${routeCatalogModule ? routeCatalogModule.renderedLength : 'missing'}`);
}
for (const [path, size] of [...sizes].filter(([path]) => /\/chunks\/(?:admin-|public-|internal-)?routes_[^/]+\.mjs$/.test(path))) {
  if (size > 32_000 || (gzipSizes.get(path) ?? 0) > 8_000) failures.push(`Feature Route Module exceeds 32000 raw or 8000 gzip bytes: ${relative(server, path)} ${size} raw ${gzipSizes.get(path) ?? 0} gzip`);
}

const wrangler = JSON.parse(
  await readFile(resolve(server, "wrangler.json"), "utf8"),
);
const sourceWrangler = JSON.parse(
  (
    await readFile(resolve(import.meta.dirname, "../wrangler.jsonc"), "utf8")
  ).replace(/^\s*\/\/.*$/gm, ""),
);
if (wrangler.images)
  failures.push(
    "Workers build unexpectedly provisions a Cloudflare Images binding",
  );
if (wrangler.vars?.NODE_ENV !== "production")
  failures.push(
    "Workers artifact must use NODE_ENV=production",
  );
const expectedName = "webunit-site-cloudflare";
if (wrangler.name !== expectedName)
  failures.push("Workers name does not match its deployment target");
if (wrangler.assets?.binding !== "ASSETS")
  failures.push("Workers build must keep the ASSETS binding");
if (wrangler.cache?.enabled !== true)
  failures.push('Workers Caching must be enabled for public response caching before invocation');
if (wrangler.cache?.cross_version_cache === true)
  failures.push('Workers Caching must remain version-isolated unless cache-affecting deployments gain an explicit purge gate');
if (wrangler.assets?.run_worker_first === true)
  failures.push('Workers Static Assets must remain asset-first');
if (wrangler.assets?.not_found_handling === 'single-page-application')
  failures.push('Workers Static Assets must not use SPA fallback');
const headersSource = await readFile(resolve(client, '_headers'), 'utf8').catch(() => '');
if (!/^\/_astro\/\*\s*\n\s*Cache-Control:\s*public,\s*max-age=31536000,\s*immutable\s*$/i.test(headersSource.trim()))
  failures.push('Only hashed /_astro/* assets may receive the immutable one-year cache policy');
const kvBindings = Array.isArray(wrangler.kv_namespaces)
  ? wrangler.kv_namespaces
  : [];
const kvBindingNames = kvBindings.map((binding) => binding.binding).sort();
if (JSON.stringify(kvBindingNames) !== JSON.stringify(["FUNCTION_CACHE", "SESSION", "WEB_CACHE"])) {
  failures.push(
    "Workers build must keep independent Functions Cache, Astro SSR Cache, and Astro-managed Session KV bindings",
  );
}
for (const [label, bindings] of [
  ["function", wrangler.services],
  ["workflow", wrangler.workflows],
]) {
  if (Array.isArray(bindings) && bindings.length > 0) {
    failures.push(`Workers build unexpectedly provisions a ${label} binding`);
  }
}
const durableObjectBindings = (wrangler.durable_objects?.bindings ?? [])
  .map((binding) => `${binding.name}:${binding.class_name}`)
  .sort();
if (
  JSON.stringify(durableObjectBindings) !==
  JSON.stringify(["RATE_LIMIT:WebunitRateLimitDurableObject"])
)
  failures.push(
    "Workers build must keep exactly the Rate Limit Durable Object binding",
  );
if (wrangler.queues)
  failures.push("Workers build must not provision Queue bindings");
if (wrangler.d1_databases?.map((binding) => binding.binding).join(",") !== "DB")
  failures.push("Workers build must keep exactly the DB D1 binding");
if (
  wrangler.r2_buckets?.map((binding) => binding.binding).join(",") !== "STORAGE"
)
  failures.push("Workers build must keep exactly the STORAGE R2 binding");
const analyticsBindings =
  wrangler.analytics_engine_datasets
    ?.map((binding) => binding.binding)
    .sort() ?? [];
const expectedAnalyticsBindings =
  sourceWrangler.analytics_engine_datasets
    ?.map((binding) => binding.binding)
    .sort() ?? [];
if (
  JSON.stringify(analyticsBindings) !==
  JSON.stringify(expectedAnalyticsBindings)
)
  failures.push(
    "Workers build must keep the declared Analytics Engine dataset bindings",
  );
const declaredCrons = wrangler.triggers?.crons ?? [];
const expectedCrons = sourceWrangler.triggers?.crons ?? [];
if (
  JSON.stringify([...declaredCrons].sort()) !==
  JSON.stringify([...expectedCrons].sort())
)
  failures.push(
    "Workers build must keep exactly the declared schedule triggers",
  );

const webPageModuleIds = (serverAttribution?.chunks ?? [])
  .flatMap((chunk) => chunk.modules.map((module) => module.id))
  .filter((id) => id.startsWith('src/web/pages/'));
const routeModuleIds = {
  gateway: ['src/platform/function/pages/_/[...path].ts'],
  page: deployment.renderer === 'theme'
    ? ['src/platform/theme/pages/[...slug].astro']
    : webPageModuleIds,
  ...(editorRoutes.includes('_preview_') ? { preview: ['src/platform/theme/pages/_preview_.astro'] } : {}),
  ...(editorRoutes.includes('_setting_') ? { setting: ['src/platform/theme/pages/_setting_.ts'] } : {}),
};
const routeBytes = {};
const routeGzipBytes = {};
const routeClosures = {};
const routeEntries = {};
const routeBudgets = {
  gateway: { raw: 100_000, gzip: 30_000 },
  // Includes directly registered Notification Definition metadata; the
  // attribution gate below still excludes Admin Feature implementation code.
  page: { raw: 185_000, gzip: 48_000 },
  preview: { raw: 180_000, gzip: 50_000 },
  setting: { raw: 180_000, gzip: 50_000 },
};
for (const [name, moduleIds] of Object.entries(routeModuleIds)) {
  const attributedRoutes = (serverAttribution?.chunks ?? []).filter((chunk) =>
    moduleIds.some((moduleId) =>
      chunk.facadeModuleId?.includes(moduleId)
      || chunk.modules.some((module) => module.id === moduleId)));
  const routes = attributedRoutes.map((chunk) => resolve(server, chunk.fileName));
  if (!routes.length) {
    failures.push(`Workers ${name} route chunk is missing`);
    continue;
  }
  const closure = new Set();
  for (const route of routes) collectStatic(route, closure);
  routeEntries[name] = routes;
  routeClosures[name] = closure;
  routeBytes[name] = [...closure]
    .filter((file) => !coldModules.has(file))
    .reduce((total, file) => total + (sizes.get(file) ?? 0), 0);
  routeGzipBytes[name] = [...closure]
    .filter((file) => !coldModules.has(file))
    .reduce((total, file) => total + (gzipSizes.get(file) ?? 0), 0);
  const budget = routeBudgets[name];
  if (routeBytes[name] > budget.raw || routeGzipBytes[name] > budget.gzip) {
    failures.push(
      `Workers ${name} route exceeds ${budget.raw} raw or ${budget.gzip} gzip bytes: ${routeBytes[name]} raw ${routeGzipBytes[name]} gzip`,
    );
  }
}

const routeExclusive = Object.fromEntries(
  Object.entries(routeClosures).map(([name, closure]) => {
    const otherClosures = Object.entries(routeClosures)
      .filter(([other]) => other !== name)
      .map(([, value]) => value);
    const files = [...closure].filter(
      (file) =>
        !coldModules.has(file) &&
        !otherClosures.some((other) => other.has(file)),
    );
    return [
      name,
      {
        raw: files.reduce((total, file) => total + (sizes.get(file) ?? 0), 0),
        gzip: files.reduce(
          (total, file) => total + (gzipSizes.get(file) ?? 0),
          0,
        ),
      },
    ];
  }),
);

for (const closure of Object.values(routeClosures)) {
  const source = [...closure]
    .map((file) => moduleSources.get(file)?.toString("utf8") ?? "")
    .join("\n");
  if (source.includes("https://openrouter.ai/api/v1/responses"))
    failures.push("OpenRouter handler entered a route static closure");
}

const closureSource = (closure) => [...closure]
  .map((file) => moduleSources.get(file)?.toString('utf8') ?? '')
  .join('\n');
const assertClosureExcludes = (label, closure, markers) => {
  const source = closureSource(closure);
  for (const marker of markers) {
    if (source.includes(marker)) failures.push(`${label} static closure contains ${marker}`);
  }
};
const attributionByChunk = new Map(
  (serverAttribution?.chunks ?? []).map((chunk) => [chunk.fileName, chunk]),
);
const attributedModulesIn = (closure) => [...closure].flatMap((file) =>
  attributionByChunk.get(relative(server, file).replaceAll('\\', '/'))?.modules ?? []
);

if (routeClosures.page) {
  assertClosureExcludes('Public SSR', routeClosures.page, [
    'background_execution',
    'createBackgroundDefinitionManifest',
    'applicationAnalyticsDefinitions',
    'defineTable({',
    'renderSqlSchema',
    'templateSettings',
    'sectionSettings',
    'templateSlotPreviews',
  ]);
  if (
    attributedModulesIn(routeClosures.page).some((module) =>
      /^src\/function\/features\/admin\//.test(module.id)
    )
  ) failures.push('Public SSR static closure contains Admin Feature implementation');
}

const coldAttributionModules = [...coldModules].flatMap((file) =>
  attributionByChunk.get(relative(server, file).replaceAll('\\', '/'))?.modules ?? [],
);
const coldForbidden = [
  {
    marker: 'datas cold',
    present: coldAttributionModules.some((module) =>
      /^(?:src\/theme\/datas\/|src\/platform\/theme\/datas\/)/.test(module.id),
    ),
  },
  {
    marker: 'table definitions cold',
    present: coldAttributionModules.some((module) =>
      /(?:^|\/)(?:database\/schema|tables\.ts$)/.test(module.id),
    ) || closureSource(coldModules).includes('defineTable({'),
  },
  {
    marker: 'migration or seed cold',
    present: coldAttributionModules.some((module) =>
      /(?:^|\/)database\/(?:migrations|seeds)\//.test(module.id),
    ),
  },
  {
    marker: 'openapi cold',
    present: coldAttributionModules.some((module) =>
      /(?:openapi|function-openapi)/i.test(module.id),
    ),
  },
  {
    marker: 'theme definition cold',
    present: coldAttributionModules.some((module) =>
      module.id === 'src/manifest.ts' ||
      module.id === 'src/theme/theme.ts' ||
      /^src\/theme\/(?:(?:sections|templates|partials)\/[^/]+|layout)\/(?:setting|definition)\.ts$/.test(module.id) ||
      /^src\/platform\/generated\/theme\/(?:definition|setting-runtime)\.ts$/.test(module.id) ||
      module.id === 'src/platform/generated/cms-installation.ts',
    ),
  },
  {
    marker: 'background handler cold',
    present: coldAttributionModules.some((module) =>
      /(?:job-handlers?|schedule-handlers?|maintenance-handler|\/handlers)\.(?:ts|mts)$/.test(module.id),
    ),
  },
  {
    marker: 'ai provider cold',
    present: coldAttributionModules.some((module) =>
      /node_modules\/.*(?:@ai-sdk|openrouter)/i.test(module.id),
    ),
  },
  {
    marker: 'analytics provider cold',
    present: coldAttributionModules.some((module) =>
      /(?:cloudflare-analytics-engine|duckdb|clickhouse|analytics\/integrations\/provider)/i.test(module.id),
    ),
  },
];
for (const item of coldForbidden) {
  if (item.present) failures.push(`Workers cold-start closure contains ${item.marker}`);
}
const coldThemeModules = [...coldModules].flatMap((file) =>
  (attributionByChunk.get(relative(server, file).replaceAll('\\', '/'))?.modules ?? [])
    .filter((module) => /^theme:(?:section|template|partial):/.test(module.owner)),
);
if (coldThemeModules.length) failures.push(`Theme Renderer entered the cold-start closure: ${coldThemeModules.map((module) => module.id).join(', ')}`);
if (/"inlinedScripts":\[\[/.test(workerSource)) failures.push('Theme browser controllers were inlined into the Worker SSR manifest');

const backgroundEntry = serverModules.find((file) => {
  const source = moduleSources.get(file)?.toString('utf8') ?? '';
  return source.includes('function_background_message_failed') && source.includes('WORKERS_SCHEDULE_HEARTBEAT');
});
if (!backgroundEntry) failures.push('Workers Background execution entry is missing');
else {
  const backgroundClosure = new Set();
  collectStatic(backgroundEntry, backgroundClosure);
  assertClosureExcludes('Queue/Schedule', backgroundClosure, [
    'loadAppRouteDefinitions',
    'createBackgroundDefinitionManifest',
    'applicationAnalyticsDefinitions',
    'templateRenders',
    'templateSettings',
    'templateSlotPreviews',
    'defineTable({',
    'renderSqlSchema',
  ]);
}

function createBundleReport() {
  const sizeOf = (file) => ({ raw: sizes.get(file) ?? 0, gzip: gzipSizes.get(file) ?? 0 });
  const closure = (files) => [...files].map((file) => ({ file: relative(server, file).replaceAll('\\', '/'), ...sizeOf(file) })).sort((left, right) => left.file.localeCompare(right.file));
  const chunks = serverModules.map((file) => {
    const name = relative(server, file).replaceAll('\\', '/');
    const attributed = attributionByChunk.get(name);
    return {
      file: name,
      ...sizeOf(file),
      loading: coldModules.has(file) ? 'cold-static' : attributed?.loading ?? 'lazy',
      imports: attributed?.imports ?? [],
      dynamicImports: attributed?.dynamicImports ?? [],
      owners: aggregateOwners(attributed?.modules ?? []),
    };
  }).sort((left, right) => left.file.localeCompare(right.file));
  const rendererOwners = aggregateOwners((serverAttribution?.chunks ?? []).flatMap((chunk) => chunk.modules)
    .filter((module) => /^theme:(?:section|template):/.test(module.owner)));
  const rendererValues = Object.values(rendererOwners).map((owner) => owner.renderedLength).sort((left, right) => left - right);
  const allModules = (serverAttribution?.chunks ?? []).flatMap((chunk) => chunk.modules.map((module) => ({ ...module, chunk: chunk.fileName, loading: chunk.loading })));
  const functionModules = allModules.filter((module) => module.owner.startsWith('function:'));
  const browserChunks = browserJsFiles.map((file) => {
    const name = relative(client, file).replaceAll('\\', '/');
    const source = browserJsSources[browserJsFiles.indexOf(file)];
    const attributed = (clientAttribution?.chunks ?? []).find((chunk) => chunk.fileName === name);
    return { file: name, raw: source.byteLength, gzip: gzipSync(source).byteLength, owners: aggregateOwners(attributed?.modules ?? []) };
  }).sort((left, right) => left.file.localeCompare(right.file));
  return {
    version: 1,
    target: 'cloudflare',
    provider,
    upload: { raw: totalServerBytes, gzip: totalServerGzipBytes, wrangler: null },
    cold: { raw: coldBytes, gzip: coldGzipBytes, modules: closure(coldModules) },
    routes: Object.fromEntries(Object.keys(routeBytes).map((name) => {
      const publicName = name === 'gateway' ? 'function' : name === 'page' ? 'ssr' : name;
      const files = routeClosures[name] ?? new Set();
      const modules = [...files].flatMap((file) => attributionByChunk.get(relative(server, file).replaceAll('\\', '/'))?.modules ?? []);
      return [publicName, { raw: routeBytes[name], gzip: routeGzipBytes[name], exclusive: routeExclusive[name], owners: aggregateOwners(modules), modules: closure(files) }];
    })),
    theme: {
      renderers: {
        count: Object.keys(rendererOwners).length,
        distribution: distribution(rendererValues),
        owners: rendererOwners,
      },
      browserJs: { files: browserJsFiles.length, raw: browserJsBytes, gzip: browserJsGzipBytes, chunks: browserChunks },
      css: { files: cssFiles.length, raw: cssBytes, gzip: cssGzipBytes },
    },
    function: {
      owners: aggregateOwners(functionModules),
      routes: aggregateOwners(functionModules.filter((module) => /(?:^|\/)(?:admin-|public-|internal-)?routes\.ts$|route/.test(module.id))),
      background: aggregateOwners(functionModules.filter((module) => /(?:background|job-handler|schedule-handler)/.test(module.id))),
      providers: aggregateOwners(allModules.filter((module) => /(?:provider|vercel-ai-sdk|@ai-sdk|openrouter)/i.test(module.id))),
    },
    chunks,
    staticAssets: {
      files: clientFiles.length,
      raw: [...clientFileSizes.values()].reduce((total, size) => total + size, 0),
      assetFirst: wrangler.assets?.run_worker_first !== true,
      spaFallback: wrangler.assets?.not_found_handling === 'single-page-application',
      workersCaching: wrangler.cache?.enabled === true,
      immutable: '/_astro/*',
      storage: { files: storageFiles.length, raw: storageBytes, gzip: storageGzipBytes },
      themeAssets: { files: themeAssetFiles.length, raw: themeAssetFiles.reduce((total, path) => total + (clientFileSizes.get(path) ?? 0), 0) },
    },
    forbidden: [
      { marker: 'node-only', present: failures.some((failure) => failure.startsWith('Node-only')) },
      { marker: 'theme/datas browser', present: browserDatasModules.length > 0 },
      ...coldForbidden,
      { marker: 'theme renderer cold', present: coldThemeModules.length > 0 },
      { marker: 'browser controller inline', present: /"inlinedScripts":\[\[/.test(workerSource) },
    ],
    failures,
  };
}

function aggregateOwners(modules) {
  const result = {};
  for (const module of modules) {
    const owner = result[module.owner] ?? { renderedLength: 0, modules: 0 };
    owner.renderedLength += module.renderedLength ?? 0;
    owner.modules += 1;
    result[module.owner] = owner;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

function distribution(values) {
  if (!values.length) return { min: 0, median: 0, p95: 0, max: 0 };
  const at = (ratio) => values[Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * ratio) - 1))];
  return { min: values[0], median: at(0.5), p95: at(0.95), max: values.at(-1) };
}
const measuredChunks = Object.fromEntries(
  [
    ["workerEntry", workerEntry],
    [
      "contentSource",
      serverModules
        .filter((path) =>
          moduleSources
            .get(path)
            .includes(
              provider === "datas"
                ? "createDatasContentSource"
                : "createCmsFunctionContentSource",
            ),
        )
        .sort((left, right) => sizes.get(right) - sizes.get(left))[0],
    ],
    [
      "theme",
      serverModules.find((path) => /\/chunks\/theme_[^/]+\.mjs$/.test(path)),
    ],
    [
      "astroParams",
      serverModules.find((path) =>
        /\/chunks\/params-and-props_[^/]+\.mjs$/.test(path),
      ),
    ],
    [
      "imageEndpoint",
      serverModules.find((path) =>
        /\/chunks\/image-passthrough-endpoint_[^/]+\.mjs$/.test(path),
      ),
    ],
  ]
    .filter(([, path]) => path)
    .map(([name, path]) => [
      name,
      { raw: sizes.get(path), gzip: gzipSizes.get(path) },
    ]),
);
const storageFiles = clientFiles.filter((path) =>
  relative(client, path).startsWith("storage/"),
);
const themeAssetFiles = clientFiles.filter((path) =>
  relative(client, path).startsWith("assets/"),
);
const storageBytes = (
  await Promise.all(storageFiles.map((path) => stat(path)))
).reduce((total, value) => total + value.size, 0);
const storageGzipBytes = (
  await Promise.all(storageFiles.map((path) => readFile(path)))
).reduce((total, value) => total + gzipSync(value).byteLength, 0);
const report = createBundleReport();
const reportPath = resolve(import.meta.dirname, '../.wrangler/reports/workers-bundle-report.json');
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length)
  throw new Error(`Workers bundle check failed:\n${failures.join("\n")}\nReport: ${relative(process.cwd(), reportPath)}`);
console.log(
  `Workers bundle check passed (cold ${coldBytes} B, server JS ${totalServerBytes} B, CSS ${cssBytes} B, routes ${JSON.stringify(routeBytes)})`,
);
console.log(
  `Workers bundle sizes ${JSON.stringify({
    provider,
    server: { raw: totalServerBytes, gzip: totalServerGzipBytes },
    cold: { raw: coldBytes, gzip: coldGzipBytes },
    chunks: measuredChunks,
    routes: Object.fromEntries(
      Object.keys(routeBytes).map((name) => [
        name,
        { raw: routeBytes[name], gzip: routeGzipBytes[name] },
      ]),
    ),
    routeExclusive,
    css: { files: cssFiles.length, raw: cssBytes, gzip: cssGzipBytes },
    browserJs: {
      files: browserJsFiles.length,
      raw: browserJsBytes,
      gzip: browserJsGzipBytes,
    },
    storage: {
      files: storageFiles.length,
      raw: storageBytes,
      gzip: storageGzipBytes,
    },
    themeAssets: {
      files: themeAssetFiles.length,
      raw: themeAssetFiles.reduce(
        (total, path) => total + (clientFileSizes.get(path) ?? 0),
        0,
      ),
    },
    staticAssets: {
      files: clientFiles.length,
      raw: [...clientFileSizes.values()].reduce(
        (total, size) => total + size,
        0,
      ),
    },
  })}`,
);
