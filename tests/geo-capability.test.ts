import assert from "node:assert/strict";
import test from "node:test";
import { createNodeMmdbGeo } from "@/function/infrastructure/server/mmdb-geo";

test("Node Geo remains noop without MMDB configuration", async () => {
  const geo = createNodeMmdbGeo();
  assert.equal(geo.describe().provider, "none");
  assert.equal(await geo.lookupIp("8.8.8.8"), undefined);
});

test("Node Geo opens configured MMDB readers lazily and merges City with ASN", async () => {
  const opened: string[] = [];
  const reader = {
    city: () => ({ country: { isoCode: "us" }, subdivisions: [{ isoCode: "CA", names: { en: "California" } }], city: { names: { en: "Mountain View" } }, location: { timeZone: "America/Los_Angeles" } }),
    country: () => ({ country: { isoCode: "US" } }),
    asn: () => ({ autonomousSystemNumber: 15169, autonomousSystemOrganization: "Google LLC" }),
  };
  const geo = createNodeMmdbGeo({
    cityDbPath: "/data/GeoLite2-City.mmdb",
    asnDbPath: "/data/GeoLite2-ASN.mmdb",
    openReader: async (path) => { opened.push(path); return reader as never; },
  });
  assert.deepEqual(geo.describe(), { provider: "maxmind-mmdb", availability: { country: true, city: true, asn: true } });
  assert.equal(await geo.lookupIp("not-an-ip"), undefined);
  assert.deepEqual(opened, []);
  assert.deepEqual(await geo.lookupIp("8.8.8.8"), {
    countryCode: "US", regionCode: "CA", regionName: "California", city: "Mountain View",
    timezone: "America/Los_Angeles", asn: 15169, asOrganization: "Google LLC",
  });
  assert.equal(opened.length, 2);
  await geo.lookupIp("1.1.1.1");
  assert.equal(opened.length, 2);
});
