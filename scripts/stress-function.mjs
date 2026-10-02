import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

const baseUrl = required('STRESS_BASE_URL').replace(/\/$/, '');
const requests = integer('STRESS_REQUESTS', 500, 1, 100_000);
const concurrency = integer('STRESS_CONCURRENCY', 25, 1, 500);
let cursor = 0;
let failures = 0;
const latencies = [];
await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, async () => {
  while (true) {
    const index = cursor++;
    if (index >= requests) return;
    const started = performance.now();
    try { const response = await fetch(`${baseUrl}/_/public/runtime/health/read`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); if (!response.ok) failures += 1; await response.arrayBuffer(); }
    catch { failures += 1; }
    latencies.push(performance.now() - started);
  }
}));
latencies.sort((a, b) => a - b);
const p95 = latencies[Math.max(0, Math.ceil(latencies.length * 0.95) - 1)] ?? 0;
const maxFailureRate = Number(process.env.STRESS_MAX_FAILURE_RATE ?? 0);
assert.ok(failures / requests <= maxFailureRate, `Failure rate ${failures}/${requests} exceeds ${maxFailureRate}`);
console.info(JSON.stringify({ event: 'function_stress_completed', baseUrl, requests, concurrency, failures, p95Ms: Math.round(p95 * 100) / 100 }));

function required(name) { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required`); return value; }
function integer(name, fallback, min, max) { const value = Number(process.env[name] ?? fallback); if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${name} must be between ${min} and ${max}`); return value; }
