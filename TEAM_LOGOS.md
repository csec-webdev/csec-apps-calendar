# Team Logos Setup

## Where to Upload Team Logos

Team logos should be uploaded to your S3 bucket at the following paths:

```
s3://csec-app-calendar/public/assets/teams/{teamKey}/logo.png
```

### Required Logo Files

Upload one logo file for each team:

- **Calgary Flames**: `public/assets/teams/flames/logo.png`
- **Calgary Hitmen**: `public/assets/teams/hitmen/logo.png`
- **Calgary Roughnecks**: `public/assets/teams/roughnecks/logo.png`
- **Calgary Stampeders**: `public/assets/teams/stampeders/logo.png`
- **Calgary Wranglers**: `public/assets/teams/wranglers/logo.png`

### Logo Requirements

- **Format**: PNG (with transparency recommended)
- **Size**: 200x200px to 400x400px (square aspect ratio)
- **Background**: Transparent or white background
- **File size**: Under 100KB for optimal loading

### How to Upload

#### Option 1: AWS Console
1. Navigate to your S3 bucket `csec-app-calendar`
2. Create folders: `public/assets/teams/{teamKey}/`
3. Upload `logo.png` for each team
4. Set permissions to be readable by CloudFront (already configured via bucket policy)

#### Option 2: AWS CLI
```bash
# Example: Upload Flames logo
aws s3 cp flames-logo.png s3://csec-app-calendar/public/assets/teams/flames/logo.png \
  --content-type image/png \
  --cache-control "public, max-age=31536000, immutable"

# Repeat for each team
```

#### Option 3: Bulk Upload Script
```bash
#!/bin/bash
# Upload all team logos at once

BUCKET="csec-app-calendar"
TEAMS=("flames" "hitmen" "roughnecks" "stampeders" "wranglers")

for team in "${TEAMS[@]}"; do
  if [ -f "logos/${team}.png" ]; then
    aws s3 cp "logos/${team}.png" \
      "s3://${BUCKET}/public/assets/teams/${team}/logo.png" \
      --content-type image/png \
      --cache-control "public, max-age=31536000, immutable"
    echo "✓ Uploaded ${team} logo"
  else
    echo "✗ Missing logos/${team}.png"
  fi
done
```

### CloudFront URLs

After uploading, logos will be accessible via CloudFront:

```
https://YOUR-CLOUDFRONT-DOMAIN/assets/teams/{teamKey}/logo.png
```

Example:
```
https://d123abc.cloudfront.net/assets/teams/flames/logo.png
```

### Admin Dashboard

Once uploaded, team logos will automatically appear in:
- Dashboard team list
- Team selector dropdown (future enhancement)
- Navigation breadcrumbs (future enhancement)

### Fallback Behavior

If a logo fails to load, the admin will show:
- A gray placeholder box with the team's first initial
- No broken image icons

### Cache Invalidation

After uploading new logos, invalidate the CloudFront cache:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/assets/teams/*"
```

Or from the AWS Console:
1. CloudFront → Distributions → Your distribution
2. Invalidations tab → Create invalidation
3. Object paths: `/assets/teams/*`

