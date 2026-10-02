import { registerPackedAsset } from "./asset";

export type PackedFile = { name: string; blob: Blob };

function u16(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}
function u32(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

/** Read an uncompressed (stored) zip. Entries stay as slices of the original blob. */
export async function readStoredZip(blob: Blob): Promise<PackedFile[]> {
  const tailLen = Math.min(blob.size, 65557);
  const tailStart = blob.size - tailLen;
  const tail = new Uint8Array(await blob.slice(tailStart).arrayBuffer());
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tail[i] === 0x50 && tail[i + 1] === 0x4b && tail[i + 2] === 0x05 && tail[i + 3] === 0x06) eocd = i;
  }
  if (eocd < 0) throw new Error("assets.zip: nincs tartalomjegyzék");
  const eocdView = new DataView(tail.buffer, tail.byteOffset + eocd, 22);
  const count = u16(eocdView, 10);
  const cdSize = u32(eocdView, 12);
  const cdOffset = u32(eocdView, 16);
  if (cdOffset === 0xffffffff || cdSize === 0xffffffff) throw new Error("assets.zip: túl nagy csomag");
  const cd = new DataView(await blob.slice(cdOffset, cdOffset + cdSize).arrayBuffer());
  const files: PackedFile[] = [];
  let p = 0;
  for (let n = 0; n < count; n++) {
    if (u32(cd, p) !== 0x02014b50) throw new Error("assets.zip: sérült tartalomjegyzék");
    const flags = u16(cd, p + 8);
    const method = u16(cd, p + 10);
    const size = u32(cd, p + 20);
    const nameLen = u16(cd, p + 28);
    const extraLen = u16(cd, p + 30);
    const commentLen = u16(cd, p + 32);
    const localOff = u32(cd, p + 42);
    const name = new TextDecoder().decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!name || name.endsWith("/")) continue;
    if (method !== 0) throw new Error(`assets.zip: ${name} nincs tárolva tömörítetlenül`);
    if (flags & 0x8) throw new Error(`assets.zip: ${name} data descriptor`);
    if (localOff === 0xffffffff) throw new Error("assets.zip: túl nagy csomag");
    const local = new DataView(await blob.slice(localOff, localOff + 30).arrayBuffer());
    if (u32(local, 0) !== 0x04034b50) throw new Error(`assets.zip: ${name} hibás fejléc`);
    const dataStart = localOff + 30 + u16(local, 26) + u16(local, 28);
    files.push({ name, blob: blob.slice(dataStart, dataStart + size, mimeFor(name)) });
  }
  return files;
}

function mimeFor(name: string): string {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".webp") return "image/webp";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".ogg") return "audio/ogg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".json") return "application/json";
  return "application/octet-stream";
}

/** Load `assets.zip` next to index.html. Returns 0 when the pack is absent (web / Electron). */
export async function tryInstallAssetPack(): Promise<number> {
  const res = await fetch(new URL("assets.zip", document.baseURI).href);
  if (!res.ok) return 0;
  const blob = await res.blob();
  if (blob.size < 22) return 0;
  const magic = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (magic[0] !== 0x50 || magic[1] !== 0x4b) return 0;
  const files = await readStoredZip(blob);
  for (const file of files) registerPackedAsset(file.name, URL.createObjectURL(file.blob));
  return files.length;
}
