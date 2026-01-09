#!/usr/bin/env node

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const adminRoot = join(__dirname, '..');

// Load environment variables from .env.local manually
const envPath = join(adminRoot, '.env.local');
let envVars = {};

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  console.log('✅ Loaded .env.local\n');
} else {
  console.log('⚠️  No .env.local found, using system AWS credentials\n');
}

// S3 Configuration
const BUCKET_NAME = envVars.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET || 'csec-app-calandar';
const REGION = envVars.AWS_REGION || process.env.AWS_REGION || 'ca-central-1';
const AWS_ACCESS_KEY_ID = envVars.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = envVars.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const CONFIG_FILE_PATH = join(projectRoot, 'public/data/roughnecks/team-config.json');
const S3_KEY = 'public/data/roughnecks/team-config.json';

console.log('📤 Uploading Roughnecks team-config.json to S3...\n');
console.log(`  Source: ${CONFIG_FILE_PATH}`);
console.log(`  Bucket: ${BUCKET_NAME}`);
console.log(`  Key: ${S3_KEY}`);
console.log(`  Region: ${REGION}\n`);

try {
  // Read the config file
  const fileContent = readFileSync(CONFIG_FILE_PATH, 'utf-8');
  console.log('✅ Config file loaded\n');
  
  // Validate JSON
  JSON.parse(fileContent);
  console.log('✅ JSON is valid\n');
  
  // Initialize S3 client with credentials
  const s3ClientConfig = { region: REGION };
  if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
    s3ClientConfig.credentials = {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    };
    console.log('✅ Using credentials from .env.local\n');
  }
  
  const s3Client = new S3Client(s3ClientConfig);
  
  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: S3_KEY,
    Body: fileContent,
    ContentType: 'application/json',
  });
  
  console.log('⏳ Uploading to S3...');
  const response = await s3Client.send(command);
  
  console.log('\n✅ Upload successful!');
  console.log('   ETag:', response.ETag);
  console.log('\n📋 Next steps:');
  console.log('   1. Go to admin interface: http://localhost:3000/admin');
  console.log('   2. Navigate to Teams > Roughnecks');
  console.log('   3. Click "Fetch Schedule"');
  console.log('   4. Should see: "Fetched 18 games"');
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  
  if (error.code === 'ENOENT') {
    console.error('\nFile not found. Make sure the config exists at:');
    console.error(CONFIG_FILE_PATH);
  } else if (error.name === 'NoSuchBucket') {
    console.error('\nS3 bucket not found. Check bucket name:', BUCKET_NAME);
  } else if (error.name === 'AccessDenied') {
    console.error('\nAccess denied. Check your AWS credentials.');
  } else {
    console.error('\nFull error:', error);
  }
  
  process.exit(1);
}
