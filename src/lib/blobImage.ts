const BLOB_IMAGE_ROUTE = "/api/blob-image";

export function blobImageUrl(pathname: string) {
  return `${BLOB_IMAGE_ROUTE}?pathname=${encodeURIComponent(pathname)}`;
}

export function isBlobImageUrl(value: string) {
  if (!value.startsWith(`${BLOB_IMAGE_ROUTE}?`)) return false;

  try {
    const url = new URL(value, "https://local.invalid");
    const pathname = url.searchParams.get("pathname") || "";
    return url.pathname === BLOB_IMAGE_ROUTE && isAllowedBlobImagePath(pathname);
  } catch {
    return false;
  }
}

export function isAllowedBlobImagePath(pathname: string) {
  if (!pathname || pathname.includes("..") || pathname.includes("\\")) return false;

  return (
    /^companies\/[^/]+\/branding\/[^/]+$/.test(pathname) ||
    /^catalog\/manufacturers\/[^/]+\/[^/]+$/.test(pathname)
  );
}
