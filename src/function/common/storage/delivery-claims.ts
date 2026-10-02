import type {
  Database,
  DatabaseStatement,
} from "@/function/common/capabilities/contracts";

const siteMountPattern =
  /^site\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function siteIdFromStorageMount(mountKey: string) {
  return siteMountPattern.exec(mountKey)?.[1]?.toLowerCase();
}

export async function requireDeliveryClaimOwner(
  database: Database,
  storageKey: string,
  mountKey: string,
  deliveryPath: string,
) {
  const siteId = siteIdFromStorageMount(mountKey);
  if (!siteId) return undefined;
  const site = await database
    .prepare(
      "select id from cms_sites where id=? and lifecycle_state='operational'",
    )
    .bind(siteId)
    .first<{ id: string }>();
  if (!site) throw new Error("Site Storage owner is not operational");
  const claim = await database
    .prepare(
      "select owner_site_id,state from storage_delivery_claims where storage_key=? and delivery_path=?",
    )
    .bind(storageKey, deliveryPath)
    .first<{ owner_site_id: string; state: string }>();
  if (claim && (claim.owner_site_id !== siteId || claim.state === "released"))
    throw new Error("Storage delivery path is owned by another Site");
  return siteId;
}

export function activateDeliveryClaimStatement(
  database: Database,
  input: Readonly<{
    storageKey: string;
    deliveryPath: string;
    siteId: string;
    entryId: string;
    now: string;
  }>,
): DatabaseStatement {
  return database
    .prepare(
      "insert into storage_delivery_claims (storage_key,delivery_path,owner_site_id,entry_id,state,claimed_at,tombstoned_at,released_at,updated_at) values (?,?,?,?,'active',?,null,null,?) on conflict(storage_key,delivery_path) do update set entry_id=excluded.entry_id,state='active',tombstoned_at=null,released_at=null,updated_at=excluded.updated_at where storage_delivery_claims.owner_site_id=excluded.owner_site_id and storage_delivery_claims.state in ('reserved','active','tombstoned')",
    )
    .bind(
      input.storageKey,
      input.deliveryPath,
      input.siteId,
      input.entryId,
      input.now,
      input.now,
    );
}

export function tombstoneDeliveryClaimStatement(
  database: Database,
  storageKey: string,
  deliveryPath: string | null | undefined,
  entryId: string,
  now: string,
): DatabaseStatement | undefined {
  if (!deliveryPath) return undefined;
  return database
    .prepare(
      "update storage_delivery_claims set entry_id=null,state='tombstoned',tombstoned_at=coalesce(tombstoned_at,?),updated_at=? where storage_key=? and delivery_path=? and entry_id=? and state='active'",
    )
    .bind(now, now, storageKey, deliveryPath, entryId);
}
