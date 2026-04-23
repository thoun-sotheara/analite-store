import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DEMO_MODE } from "@/lib/config/demo";

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_PRIVATE_BUCKET;

const s3Client =
  region && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? new S3Client({ region })
    : null;

type GenerateSecureTemplateDownloadUrlInput = {
  s3Key: string;
  sessionId: string;
  transactionId: string;
};

export async function generateSecureTemplateDownloadUrl({
  s3Key,
  sessionId,
  transactionId,
}: GenerateSecureTemplateDownloadUrlInput): Promise<string> {
  if (!s3Client || !bucket) {
    if (DEMO_MODE) {
      return `/api/demo/download?tx=${transactionId}`;
    }

    throw new Error("S3 credentials are not configured.");
  }

  if (!sessionId) {
    throw new Error("Active session is required before creating a secure download link.");
  }

  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
  const safeTransactionId = transactionId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ResponseContentDisposition:
      `attachment; filename="template-${safeTransactionId}-${safeSessionId}.zip"`,
    ResponseCacheControl: "private, max-age=3600",
  });

  // URLs expire in 60 minutes for safer delivery.
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
