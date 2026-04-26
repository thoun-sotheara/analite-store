import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

const s3Client =
  region && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? new S3Client({ region })
    : null;

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "file";
}

export type UploadTarget = "templates" | "images";

function toPublicUrl(key: string): string {
  const explicitBase = process.env.AWS_S3_PUBLIC_BASE_URL?.trim();
  if (explicitBase) {
    return `${explicitBase.replace(/\/+$/, "")}/${key}`;
  }

  if (!bucket || !region) {
    return key;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function uploadAdminAsset(file: File, target: UploadTarget): Promise<{ key: string; publicUrl: string }> {
  if (!s3Client || !bucket) {
    throw new Error("S3 upload is not configured.");
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const fileName = sanitizeFileName(file.name);
  const key = `uploads/${target}/${y}/${m}/${randomUUID()}-${fileName}`;

  const bytes = await file.arrayBuffer();

  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: Buffer.from(bytes),
    ContentType: file.type || undefined,
  }));

  return {
    key,
    publicUrl: toPublicUrl(key),
  };
}
