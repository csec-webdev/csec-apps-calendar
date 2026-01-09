import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";

const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;

let cloudfront: CloudFrontClient | null = null;

if (distributionId) {
  cloudfront = new CloudFrontClient({
    region: process.env.AWS_REGION || "ca-central-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Invalidate CloudFront cache for specific paths
 * @param paths - Array of paths to invalidate (e.g., ["/data/flames/*", "/sponsors/flames/*"])
 */
export async function invalidateCache(paths: string[]): Promise<void> {
  if (!cloudfront || !distributionId) {
    console.warn("CloudFront invalidation skipped (CLOUDFRONT_DISTRIBUTION_ID not set)");
    return;
  }

  try {
    await cloudfront.send(
      new CreateInvalidationCommand({
        DistributionId: distributionId,
        InvalidationBatch: {
          CallerReference: `admin-${Date.now()}`,
          Paths: {
            Quantity: paths.length,
            Items: paths,
          },
        },
      }),
    );
    console.log(`CloudFront invalidation created for: ${paths.join(", ")}`);
  } catch (error) {
    console.error("CloudFront invalidation failed:", error);
    throw error;
  }
}

