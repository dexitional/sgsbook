import { randomUUID } from "node:crypto";
import { createPresignedUploadUrl } from "../../lib/storage.js";
import { AppError } from "../../middleware/error-handler.js";
import type { z } from "zod";
import type { presignSchema } from "./schema.js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

type PresignInput = z.infer<typeof presignSchema>;

export async function presignUpload(input: PresignInput) {
  if (!ALLOWED_TYPES.has(input.contentType)) {
    throw new AppError("Only JPEG, PNG, WebP, or GIF images are allowed.", 400);
  }

  const key = `${input.folder}/${randomUUID()}.${EXT_BY_TYPE[input.contentType]}`;
  return createPresignedUploadUrl(key, input.contentType);
}
