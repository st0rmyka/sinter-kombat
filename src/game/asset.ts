/** Root-relative in grok.me (`/sprites/…`); relative for itch.io / Electron (`./sprites/…`). */
const PACKED = new Map<string, string>();

function packKey(path: string): string {
  return path.split("#")[0].split("?")[0].replace(/^\.\//, "").replace(/^\/+/, "");
}

/** Blob URL for a file inside the itch asset pack. Keys are paths like `sprites/brendon/idle.png`. */
export function registerPackedAsset(path: string, url: string) {
  PACKED.set(packKey(path), url);
}

export function asset(path: string): string {
  if (!path || path.startsWith("blob:") || path.startsWith("http:") || path.startsWith("https:") || path.startsWith("data:")) {
    return path;
  }
  const packed = PACKED.get(packKey(path));
  if (packed) return packed;
  const base = import.meta.env.BASE_URL || "/";
  const rel = path.replace(/^\//, "");
  if (base === "/") return `/${rel}`;
  return `${base.endsWith("/") ? base : `${base}/`}${rel}`;
}

export function assetUrl(path: string): string {
  return `url(${asset(path)})`;
}

