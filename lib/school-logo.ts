export const schoolLogoBucket = "school-logos";
export const maxSchoolLogoBytes = 2 * 1024 * 1024;

const formats = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export async function validateSchoolLogoFile(file: File): Promise<"png" | "jpg" | "webp"> {
  if (file.size === 0) throw new Error("Choose a non-empty logo image.");
  if (file.size > maxSchoolLogoBytes) throw new Error("Choose a logo smaller than 2 MB.");
  const extension = formats[file.type as keyof typeof formats];
  if (!extension) throw new Error("Choose a PNG, JPG, or WebP logo.");

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  const jpg = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!((extension === "png" && png) || (extension === "jpg" && jpg) || (extension === "webp" && webp))) {
    throw new Error("This file does not appear to be a valid PNG, JPG, or WebP image.");
  }
  return extension;
}

export function schoolLogoUploadError(error: { message?: string; statusCode?: string | number }): Error {
  if (String(error.statusCode) === "404" || /bucket not found/i.test(error.message || "")) {
    return new Error("School logo storage is not ready. Apply the school-logo migration in Supabase.");
  }
  if (/row.level security|permission|unauthorized|forbidden/i.test(error.message || "")) {
    return new Error("You do not have permission to upload this logo. Sign in again and retry.");
  }
  return new Error("Could not upload the school logo. Please try again.");
}
