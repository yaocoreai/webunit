import { storageUploadSessionAdminSchema } from "./schemas";

export function mapStorageUploadSessionRow(row: Readonly<Record<string, unknown>>) {
  const mapped = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase()),
      value,
    ]),
  );
  return storageUploadSessionAdminSchema.parse(mapped);
}
