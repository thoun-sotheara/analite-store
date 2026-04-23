import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_PRIVATE_BUCKET;

const s3Client =
  region && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? new S3Client({ region })
    : null;

export async function generateTemplateDownloadUrl(s3Key: string): Promise<string> {
  if (!s3Client || !bucket) {
    throw new Error("S3 is not configured. Set AWS env vars before requesting downloads.");
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ResponseContentDisposition: "attachment",
  });

  // 12 hours = 43200 seconds.
  return getSignedUrl(s3Client, command, { expiresIn: 43_200 });
}
