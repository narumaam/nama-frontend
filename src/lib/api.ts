const DEFAULT_PUBLIC_API_PATH = "/api/v1";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) return trimTrailingSlash(envUrl);
  return "";
}

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${normalizedPath}` : `${DEFAULT_PUBLIC_API_PATH}${normalizedPath}`;
}
