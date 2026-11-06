import { getAdminClient } from "../infrastructure/supabase/client";
import { Errors } from "./errors";

const BUCKET = "photos";
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function uploadPhoto(folder: string, id: string, dataUrl: string) {
  const match = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrl);
  const extension = match ? TYPES[match[1]] : undefined;
  if (!match || !extension) {
    throw Errors.validation({ photo: "INVALID_IMAGE" });
  }
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_BYTES) {
    throw Errors.validation({ photo: "IMAGE_TOO_LARGE" });
  }

  const path = `${folder}/${id}-${Date.now()}.${extension}`;
  const { error } = await getAdminClient().storage.from(BUCKET).upload(path, bytes, { contentType: match[1], upsert: true });
  if (error) {
    throw Errors.database(error.message);
  }
  return getAdminClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
