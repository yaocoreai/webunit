export function storagePublicUrl(storageKey: string, deliveryPath: string) {
  const path = deliveryPath.split("/").map(encodeURIComponent).join("/");
  return storageKey === "default"
    ? `/_/public/storage/${path}`
    : `/_/public/storage-instances/${encodeURIComponent(storageKey)}/${path}`;
}
