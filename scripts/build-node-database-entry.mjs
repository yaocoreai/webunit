import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDatabaseSeeds } from "./database-seeds.mjs";

function foldedVersions(baselineVersion) {
  return Array.from({ length: Number(baselineVersion) }, (_, index) =>
    String(index + 1).padStart(4, "0"),
  );
}

const appRoot = dirname(dirname(fileURLToPath(import.meta.url))),
  baseline = await readFile(
    resolve(appRoot, "database/migrations/0000_initial.sql"),
    "utf8",
  ),
  baselineVersion = (await readFile(resolve(appRoot, "database/migrations/BASELINE_VERSION"), "utf8")).trim(),
  migrationDirectory = resolve(appRoot, "database/migrations/versions"),
  files = (
    await readdir(migrationDirectory).catch((error) => {
      if (error?.code === "ENOENT") return [];
      throw error;
    })
  )
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort(),
  migrations = await Promise.all(
    files.map(async (file) => ({
      version: file.slice(0, 4),
      name: file.slice(5, -4),
      sql: await readFile(resolve(migrationDirectory, file), "utf8"),
    })),
  ),
  seeds = await loadDatabaseSeeds(appRoot);
if (!/CREATE TABLE\s+system_migration_versions/i.test(baseline))
  throw new Error("Initial schema has no migration version table");
const output = resolve(appRoot, "dist/server/database-command.mjs");
await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  `import Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
const action=process.argv[2];
if(!["migrate","seed","status","doctor"].includes(action))throw new Error("Database action must be migrate, seed, status, or doctor");
const baseline=${JSON.stringify(baseline)},baselineVersion=${JSON.stringify(baselineVersion)},folded=${JSON.stringify(foldedVersions(baselineVersion))},migrations=${JSON.stringify(migrations)},seeds=${JSON.stringify(seeds)},file=resolve(process.env.WEB_DATABASE_FILE||".data/site.sqlite");
mkdirSync(dirname(file),{recursive:true});
const database=new Database(file),hash=(value)=>createHash("sha256").update(value).digest("hex"),has=(name)=>Boolean(database.prepare("select 1 from sqlite_master where type='table' and name=?").get(name)),record=(version,name,checksum,executionMs)=>database.prepare("insert into system_migration_versions (version,name,checksum,execution_ms,applied_at) values (?,?,?,?,?)").run(version,name,checksum,executionMs,new Date().toISOString());
database.pragma("foreign_keys = ON");database.pragma("journal_mode = WAL");
try{
  if(action==="migrate")migrate();
  else if(action==="seed")seed();
  const status=inspect();
  if(action==="doctor"){
    const integrity=database.pragma("integrity_check");
    if(integrity.length!==1||integrity[0]?.integrity_check!=="ok")throw new Error("SQLite integrity check failed");
    if(status.pendingMigrations.length)throw new Error("Database has pending migrations: "+status.pendingMigrations.join(", "));
    if(status.pendingSeeds.length)throw new Error("Database has pending Seeds: "+status.pendingSeeds.join(", "));
    console.log(JSON.stringify({event:"database_doctor_completed",target:"container",file,result:{...status,integrity:"ok"}}));
  }else console.log(JSON.stringify({event:"database_"+(action==="migrate"?"migrated":action==="seed"?"seeded":"status"),target:"container",file,result:status}));
}finally{database.close();}
function migrate(){
  const tables=database.prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%'").all();
  if(!tables.length){database.transaction(()=>{database.exec(baseline);record("0000","initial",hash(baseline),0);for(const version of folded){const migration=migrations.find(item=>item.version===version);if(migration)record(migration.version,migration.name,hash(migration.sql),0);else record(version,"folded","folded",0);}for(const migration of migrations){if(migration.version>baselineVersion){database.exec(migration.sql);record(migration.version,migration.name,hash(migration.sql),0);}}})();return;}
  if(!has("system_migration_versions")){const migration=migrations[0];if(!migration||migration.version!=="0001")throw new Error("Legacy database requires migration 0001");const started=Date.now();database.transaction(()=>{database.exec(migration.sql);record("0000","legacy-baseline","legacy",0);record(migration.version,migration.name,hash(migration.sql),Date.now()-started);})();}
  const owner=randomUUID(),now=new Date(),expires=new Date(now.getTime()+120000),lock=database.prepare("insert into system_migration_lock (lock_key,owner_id,expires_at,updated_at) values ('schema',?,?,?) on conflict(lock_key) do update set owner_id=excluded.owner_id,expires_at=excluded.expires_at,updated_at=excluded.updated_at where system_migration_lock.expires_at<=excluded.updated_at").run(owner,expires.toISOString(),now.toISOString()),current=database.prepare("select owner_id from system_migration_lock where lock_key='schema'").get();
  if(!lock.changes&&current?.owner_id!==owner)throw new Error("Database migration lock is held by another executor");
  try{const applied=new Map(database.prepare("select version,checksum from system_migration_versions").all().map(row=>[row.version,row.checksum])),known=new Set(["0000",...folded,...migrations.map(item=>item.version)]),unknown=[...applied.keys()].filter(version=>!known.has(version));if(unknown.length)throw new Error("Database contains unknown migrations: "+unknown.join(", "));for(const migration of migrations){const checksum=hash(migration.sql),existing=applied.get(migration.version);if(existing&&existing!==checksum)throw new Error("Migration checksum changed: "+migration.version);if(existing)continue;const started=Date.now();database.transaction(()=>{database.exec(migration.sql);record(migration.version,migration.name,checksum,Date.now()-started);})();}}finally{database.prepare("delete from system_migration_lock where lock_key='schema' and owner_id=?").run(owner);}
}
function seed(){
  if(!has("database_seed_records"))throw new Error("Database migration is required before seed");
  const applied=new Map(database.prepare("select seed_key,checksum from database_seed_records").all().map(row=>[row.seed_key,row.checksum])),known=new Set(seeds.map(item=>item.key)),unknown=[...applied.keys()].filter(key=>!known.has(key));if(unknown.length)throw new Error("Database contains unknown Seeds: "+unknown.join(", "));
  for(const item of seeds){const checksum=applied.get(item.key);if(checksum&&checksum!==item.checksum)throw new Error("Seed checksum changed: "+item.key);if(checksum)continue;database.transaction(()=>{database.exec(item.sql);database.prepare("insert into database_seed_records (seed_key,checksum,applied_at) values (?,?,?)").run(item.key,item.checksum,new Date().toISOString());})();}
}
function inspect(){
  if(!has("system_migration_versions")||!has("database_seed_records"))throw new Error("Database migration is required before "+action);
  const appliedMigrations=new Map(database.prepare("select version,checksum from system_migration_versions order by version").all().map(row=>[row.version,row.checksum])),knownMigrations=new Set(["0000",...folded,...migrations.map(item=>item.version)]),unknownMigrations=[...appliedMigrations.keys()].filter(version=>!knownMigrations.has(version));if(unknownMigrations.length)throw new Error("Database contains unknown migrations: "+unknownMigrations.join(", "));
  for(const migration of migrations){const checksum=appliedMigrations.get(migration.version);if(checksum&&checksum!==hash(migration.sql))throw new Error("Migration checksum changed: "+migration.version);}
  const appliedSeeds=new Map(database.prepare("select seed_key,checksum from database_seed_records order by seed_key").all().map(row=>[row.seed_key,row.checksum])),knownSeeds=new Set(seeds.map(item=>item.key)),unknownSeeds=[...appliedSeeds.keys()].filter(key=>!knownSeeds.has(key));if(unknownSeeds.length)throw new Error("Database contains unknown Seeds: "+unknownSeeds.join(", "));
  for(const item of seeds){const checksum=appliedSeeds.get(item.key);if(checksum&&checksum!==item.checksum)throw new Error("Seed checksum changed: "+item.key);}
  return {currentVersion:[...appliedMigrations.keys()].at(-1)??null,pendingMigrations:migrations.filter(item=>!appliedMigrations.has(item.version)).map(item=>item.version),seedsApplied:appliedSeeds.size,pendingSeeds:seeds.filter(item=>!appliedSeeds.has(item.key)).map(item=>item.key)};
}
`,
);
console.log(`Generated ${output}`);
