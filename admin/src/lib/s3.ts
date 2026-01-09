import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const V2_BUCKET = requireEnv("AWS_S3_BUCKET");

export const s3 = new S3Client({
  region: process.env.AWS_REGION || "ca-central-1",
  credentials: {
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  },
});

async function streamToString(body: any): Promise<string> {
  if (!body) return "";
  if (typeof body.transformToString === "function") return await body.transformToString();
  // Fallback for Node streams
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    body.on("data", (c: Buffer) => chunks.push(c));
    body.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    body.on("error", reject);
  });
}

export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: V2_BUCKET, Key: key }));
    const text = await streamToString(res.Body);
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (e: any) {
    if (e?.name === "NoSuchKey") return null;
    throw e;
  }
}

export async function putJson(key: string, data: unknown): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: V2_BUCKET,
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
      CacheControl: "no-cache",
    }),
  );
}


