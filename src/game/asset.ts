/** Root-relative in grok.me (`/sprites/…`); relative for itch.io / Electron (`./sprites/…`). */
export function asset(path: string): string {
  if (!path || path.startsWith("blob:") || path.startsWith("http:") || path.startsWith("https:") || path.startsWith("data:")) {
    return path;
  }
  const base = import.meta.env.BASE_URL || "/";
  const rel = path.replace(/^\//, "");
  if (base === "/") return `/${rel}`;
  return `${base.endsWith("/") ? base : `${base}/`}${rel}`;
}

export function assetUrl(path: string): string {
  return `url(${asset(path)})`;
}
