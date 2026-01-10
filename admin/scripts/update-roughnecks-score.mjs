import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { config } from 'dotenv';
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Load environment variables
config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env.local') });

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const cloudFrontClient = new CloudFrontClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function updateScore() {
  const bucket = process.env.AWS_S3_BUCKET;
  const key = "public/data/roughnecks/schedule.json";

  console.log("📥 Fetching current schedule from S3...");
  
  // Get current schedule
  const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(getCommand);
  const scheduleData = JSON.parse(await response.Body.transformToString());

  console.log("📝 Current games in schedule:", Object.keys(scheduleData).length);

  // Find and update January 10, 2026 game
  const gameDate = "2026-01-10";
  
  if (!scheduleData[gameDate]) {
    console.error("❌ Game not found for date:", gameDate);
    console.log("Available dates:", Object.keys(scheduleData).sort().slice(-10));
    return;
  }

  const game = scheduleData[gameDate];
  console.log("\n📊 Found game:");
  console.log("  Date:", gameDate);
  console.log("  Opponent:", game.opponent?.name);
  console.log("  Current state:", game.gameState);
  console.log("  Current score:", game.flamesScore, "-", game.opponentScore);

  // Update the game with final score
  game.gameState = "FINAL";
  game.time = null;
  game.flamesScore = 10;  // Calgary/Roughnecks
  game.opponentScore = 11; // Vancouver
  game.periodType = "OT";
  game.result = "OTL 10-11";

  console.log("\n✏️  Updating to:");
  console.log("  State: FINAL");
  console.log("  Score: 10-11 (OT)");
  console.log("  Result: OTL 10-11");

  // Save back to S3
  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(scheduleData, null, 2),
    ContentType: "application/json",
  });

  await s3Client.send(putCommand);
  console.log("✅ Schedule updated in S3");

  // Invalidate CloudFront cache
  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  if (distributionId) {
    const invalidationCommand = new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `update-roughnecks-${Date.now()}`,
        Paths: {
          Quantity: 1,
          Items: ["/data/roughnecks/schedule.json"],
        },
      },
    });

    await cloudFrontClient.send(invalidationCommand);
    console.log("✅ CloudFront cache invalidated");
  }

  console.log("\n🎉 Done! The calendar should update shortly.");
}

updateScore().catch(console.error);
