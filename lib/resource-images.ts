import { getSupabase } from "./supabase";
import { validateResourceImage, type ResourceImage } from "./resource-image-data";
export { maxResourceImages, maxResourceImageBytes, validateResourceImage, type ResourceImage } from "./resource-image-data";

export const resourceImageBucket = "resource-images";

export function resourceImageStorageError(error: { message?: string; statusCode?: string | number }): Error {
  if (String(error.statusCode) === "404" || /bucket not found/i.test(error.message || "")) {
    return new Error("Resource picture storage is not ready. Please contact your administrator.");
  }
  if (/row.level security|permission|unauthorized|forbidden/i.test(error.message || "")) {
    return new Error("You do not have permission to access these pictures. Sign in again and retry.");
  }
  return new Error("Could not access resource pictures. Please try again.");
}

export async function uploadResourceImages(userId: string, planId: string, files: File[]): Promise<ResourceImage[]> {
  const uploaded: ResourceImage[] = [];
  try {
    for (const file of files) {
      const extension = await validateResourceImage(file);
      const path = `${userId}/${planId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await getSupabase().storage.from(resourceImageBucket).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw resourceImageStorageError(error);
      uploaded.push({ path, name: file.name.slice(0, 200) });
    }
    return uploaded;
  } catch (error) {
    if (uploaded.length) await removeResourceImages(uploaded.map((image) => image.path)).catch(() => {});
    throw error;
  }
}

export async function removeResourceImages(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await getSupabase().storage.from(resourceImageBucket).remove(paths);
  if (error) throw resourceImageStorageError(error);
}
