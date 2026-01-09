#!/bin/bash

# Upload Roughnecks team-config.json to S3

# Load environment variables (if .env.local exists)
if [ -f "admin/.env.local" ]; then
    export $(cat admin/.env.local | grep -v '^#' | xargs)
fi

BUCKET_NAME="${AWS_S3_BUCKET:-csec-app-calandar}"
CONFIG_FILE="public/data/roughnecks/team-config.json"
S3_KEY="public/data/roughnecks/team-config.json"

echo "Uploading Roughnecks team-config.json..."
echo "  Source: $CONFIG_FILE"
echo "  Bucket: $BUCKET_NAME"
echo "  Key: $S3_KEY"
echo ""

aws s3 cp "$CONFIG_FILE" "s3://$BUCKET_NAME/$S3_KEY" \
  --content-type application/json \
  --region "${AWS_REGION:-ca-central-1}"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Upload successful!"
    echo ""
    echo "Now you can:"
    echo "1. Go to admin interface"
    echo "2. Navigate to Teams > Roughnecks"
    echo "3. Click 'Fetch Schedule'"
else
    echo ""
    echo "❌ Upload failed!"
    echo "Check your AWS credentials and permissions."
fi
