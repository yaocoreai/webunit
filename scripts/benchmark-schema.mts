import { performance } from "node:perf_hooks";
import { compileSchema, s } from "../src/function/common/app/schema";

const iterations = 250_000;
const input = Object.freeze({
  name: "  Ada Lovelace  ",
  email: "  ADA@example.com  ",
  tags: ["admin", "editor", "publisher"],
});
const schema = s.object({
  name: s.string().trim().min(1).max(128),
  email: s.string().trim().lowercase().email().max(254),
  tags: s.array(s.string().trim().min(1).max(32)).max(16).unique(),
});
const parser = compileSchema(schema);

for (let index = 0; index < 10_000; index += 1) parser.safeParse(input);

const compiledMs = measure(() => {
  const result = parser.safeParse(input);
  if (!result.success) throw new Error("Compiled Schema benchmark input failed");
});
const handwrittenMs = measure(() => {
  if (!handwrittenBaseline(input))
    throw new Error("Handwritten benchmark input failed");
});

console.log(JSON.stringify({
  iterations,
  compiled: metric(compiledMs),
  handwrittenBaseline: metric(handwrittenMs),
  compiledToBaselineRatio: Number((compiledMs / handwrittenMs).toFixed(2)),
}, null, 2));

function measure(run: () => void) {
  const startedAt = performance.now();
  for (let index = 0; index < iterations; index += 1) run();
  return performance.now() - startedAt;
}

function metric(milliseconds: number) {
  return {
    milliseconds: Number(milliseconds.toFixed(2)),
    operationsPerSecond: Math.round(iterations / (milliseconds / 1_000)),
  };
}

function handwrittenBaseline(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !["name", "email", "tags"].includes(key)))
    return false;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const email = typeof record.email === "string"
    ? record.email.trim().toLowerCase()
    : "";
  if (!name || name.length > 128 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return false;
  if (!Array.isArray(record.tags) || record.tags.length > 16) return false;
  const tags = record.tags.map((tag) => typeof tag === "string" ? tag.trim() : "");
  return tags.every((tag) => tag.length > 0 && tag.length <= 32) &&
    new Set(tags).size === tags.length;
}
