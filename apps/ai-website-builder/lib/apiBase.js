export function getApiBase() {
  const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const basePath = rawBasePath.endsWith("/")
    ? rawBasePath.slice(0, -1)
    : rawBasePath;
  if (typeof window !== "undefined") {
    if (basePath && window.location.pathname.startsWith(basePath)) {
      return `${basePath}/api`;
    }
    return "/api";
  }
  return basePath ? `${basePath}/api` : "/api";
}
