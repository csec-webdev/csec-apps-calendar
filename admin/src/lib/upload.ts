import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, V2_BUCKET } from "./s3";

/**
 * Upload a file to S3 sponsors folder
 * @param teamKey - Team identifier (e.g., "flames")
 * @param file - File to upload
 * @returns Public URL of the uploaded file
 */
export async function uploadSponsorLogo(
  teamKey: string,
  file: File | Blob,
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file instanceof File ? file.name.split(".").pop() : "png";
  const key = `public/sponsors/${teamKey}/${Date.now()}.${extension}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: V2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || "image/png",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  // Return the CloudFront URL (or S3 URL if no CloudFront)
  const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;
  if (cloudfrontDomain) {
    return `https://${cloudfrontDomain}/${key.replace(/^public\//, "")}`;
  }

  // Fallback to S3 URL
  const region = process.env.AWS_REGION || "ca-central-1";
  return `https://${V2_BUCKET}.s3.${region}.amazonaws.com/${key}`;
}

