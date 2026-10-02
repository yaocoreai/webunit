import { defineRoute } from "@/function/common/route/definition";
import { lazyOperations } from "@/function/common/route/operation-module";
import type { RouteContract } from "@/function/common/app/operation";
import { httpRoute } from "@/function/common/route/http";
import * as contracts from "./contracts";

const diagnostics = lazyOperations(() => import("./diagnostic-operations"));
const catalog = lazyOperations(() => import("./catalog-operations"));
export const routes = [
  adminRoute(
    "admin.storage.runtime.read",
    contracts.readStorageRuntimeContract,
    "readStorageRuntimeQuery",
    diagnostics,
  ),
  adminRoute(
    "admin.storage.upload-session.list",
    contracts.listStorageUploadSessionsContract,
    "listStorageUploadSessionsQuery",
    diagnostics,
  ),
  adminRoute(
    "admin.storage.upload-session.read",
    contracts.readStorageUploadSessionContract,
    "readStorageUploadSessionQuery",
    diagnostics,
  ),
  adminRoute(
    "admin.storage.upload-session.cleanup",
    contracts.cleanupStorageUploadSessionContract,
    "cleanupStorageUploadSessionAdminCommand",
    diagnostics,
  ),
  adminRoute(
    "admin.storage.catalog.browse",
    contracts.browseStorageCatalogContract,
    "browseStorageCatalogQuery",
  ),
  adminRoute(
    "admin.storage.object.read",
    contracts.readStorageCatalogObjectContract,
    "readStorageCatalogObjectQuery",
  ),
  adminRoute(
    "admin.storage.object.delete",
    contracts.deleteStorageCatalogObjectContract,
    "deleteStorageCatalogObjectCommand",
  ),
  adminRoute(
    "admin.storage.entry.update",
    contracts.updateStorageCatalogEntryContract,
    "updateStorageCatalogEntryCommand",
  ),
  adminRoute(
    "admin.storage.entry.copy",
    contracts.copyStorageCatalogEntryContract,
    "copyStorageCatalogEntryCommand",
  ),
  adminRoute(
    "admin.storage.directory.create",
    contracts.createStorageDirectoryContract,
    "createStorageDirectoryCommand",
  ),
  adminRoute(
    "admin.storage.directory.rename",
    contracts.renameStorageDirectoryContract,
    "renameStorageDirectoryCommand",
  ),
  adminRoute(
    "admin.storage.directory.delete",
    contracts.deleteStorageDirectoryContract,
    "deleteStorageDirectoryCommand",
  ),
  adminRoute(
    "admin.storage.read-url.create",
    contracts.createStorageReadUrlContract,
    "createStorageReadUrlCommand",
  ),
  adminRoute(
    "admin.storage.read-urls.create",
    contracts.createStorageReadUrlsContract,
    "createStorageReadUrlsCommand",
  ),
  adminRoute(
    "admin.storage.mount.list",
    contracts.listStorageMountsContract,
    "listStorageMountsQuery",
  ),
  adminRoute(
    "admin.storage.upload-ticket.issue",
    contracts.issueStorageUploadTicketContract,
    "issueStorageUploadTicketCommand",
  ),
  publicRoute(
    "public.storage.upload.create",
    contracts.createStorageUploadContract,
    "createStorageUploadCommand",
  ),
  publicRoute(
    "public.storage.upload.resume",
    contracts.resumeStorageUploadContract,
    "resumeStorageUploadCommand",
  ),
  publicRoute(
    "public.storage.upload.complete",
    contracts.completeStorageUploadContract,
    "completeStorageUploadCommand",
  ),
  publicRoute(
    "public.storage.upload.status",
    contracts.readStorageUploadStatusContract,
    "readStorageUploadStatusQuery",
  ),
  publicRoute(
    "public.storage.upload.parts.sign",
    contracts.signStorageUploadPartsContract,
    "signStorageUploadPartsCommand",
  ),
  publicRoute(
    "public.storage.upload.abort",
    contracts.abortStorageUploadContract,
    "abortStorageUploadCommand",
  ),
  defineRoute("public.storage.read.signed", {
    contract: contracts.readSignedStorageContentContract,
    specs: [
      { kind: "response-file" },
      httpRoute({
        method: "GET",
        path: "/public/storage/read/*",
        input: {
          path: { wildcard: "deliveryPath" },
          query: {
            storageKey: "storageKey",
            visibility: "visibility",
            purpose: "purpose",
            disposition: "disposition",
            expiresAt: "expiresAt",
            signature: "signature",
          },
        },
      }),
    ],
    operation: catalog("readSignedStorageContentQuery"),
  }),
  defineRoute("public.storage.read.instance", {
    contract: contracts.readStorageInstanceContentContract,
    specs: [
      { kind: "response-file" },
      httpRoute({
        method: "GET",
        path: "/public/storage-instances/:storageKey/*",
        input: {
          path: {
            storageKey: "storageKey",
            wildcard: "deliveryPath",
          },
        },
      }),
    ],
    operation: catalog("readPublicStorageContentQuery"),
  }),
  defineRoute("public.storage.read.public", {
    contract: contracts.readPublicStorageContentContract,
    specs: [
      { kind: "response-file" },
      httpRoute({
        method: "GET",
        path: "/public/storage/*",
        input: { path: { wildcard: "deliveryPath" } },
      }),
    ],
    operation: catalog("readPublicStorageContentQuery"),
  }),
] as const;

function adminRoute(
  name: `admin.storage.${string}.${string}`,
  contract: RouteContract,
  operation: string,
  loader = catalog,
) {
  return defineRoute(name, {
    contract,
    operation: loader(operation as never),
  });
}
function publicRoute(
  name:
    | `public.storage.${string}.${string}`
    | `public.storage.${string}.${string}.${string}`,
  contract: RouteContract,
  operation: keyof typeof import("./catalog-operations"),
) {
  return defineRoute(name, {
    contract,
    operation: catalog(operation),
  });
}
