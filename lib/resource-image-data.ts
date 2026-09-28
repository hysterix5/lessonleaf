export const maxResourceImages = 5;
export const maxResourceImageBytes = 5 * 1024 * 1024;

export type ResourceImage = { path: string; name: string };

const formats = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;

export async function validateResourceImage(file: File): Promise<"png" | "jpg" | "webp"> {
  if (!file.size) throw new Error("Choose a non-empty picture.");
  if (file.size > maxResourceImageBytes) throw new Error("Each picture must be 5 MB or smaller.");
  const extension = formats[file.type as keyof typeof formats];
  if (!extension) throw new Error("Choose PNG, JPG, or WebP pictures.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  const jpg = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!((extension === "png" && png) || (extension === "jpg" && jpg) || (extension === "webp" && webp))) {
    throw new Error("This file does not appear to be a valid PNG, JPG, or WebP picture.");
  }
  return extension;
}
