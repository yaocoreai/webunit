/**
 * Theme `/_setting_` reader. Sync should use Function CMS
 * `admin.cms.installation.manifest.read` instead.
 */
export async function readThemeInstallation() {
  const { readCmsInstallationManifest } = await import(
    "@/platform/generated/cms-installation"
  );
  return readCmsInstallationManifest();
}
