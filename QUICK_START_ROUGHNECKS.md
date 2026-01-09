# Quick Start: Calgary Roughnecks (NLL) Integration

This guide walks through setting up the NLL Champion Data API integration for the Calgary Roughnecks.

## Prerequisites

- Champion Data API credentials (username and password)
- Access to the admin interface
- Calgary Roughnecks squad ID from Champion Data

## Step 1: Obtain API Credentials

Contact Champion Data to obtain:
- API username
- API password
- Confirm the base URL: `https://api.nll.championdata.io`

## Step 2: Find the Roughnecks Squad ID

You can query the API to find the squad ID:

```bash
# Set your credentials
USERNAME="your_username"
PASSWORD="your_password"

# Get all squads for NLL (league ID = 1)
curl -X GET "https://api.nll.championdata.io/v1/leagues/1/squads" \
  -H "Authorization: Basic $(echo -n $USERNAME:$PASSWORD | base64)" \
  -H "Content-Type: application/json"
```

Look for Calgary Roughnecks in the response and note the `squadId`.

## Step 3: Update Team Configuration

1. Open the admin interface: `http://localhost:3000/admin`
2. Navigate to **Settings** (or directly edit the config file)
3. Update `public/data/roughnecks/team-config.json`:

```json
{
  "championData": {
    "apiBaseUrl": "https://api.nll.championdata.io",
    "username": "YOUR_ACTUAL_USERNAME",
    "password": "YOUR_ACTUAL_PASSWORD",
    "leagueId": "1",
    "levelId": "TBD",
    "squadId": "ACTUAL_SQUAD_ID"
  },
  "lastFetchedSeasons": [],
  "lastUpdated": "2025-01-09T00:00:00.000Z"
}
```

**Important Notes:**
- Replace `YOUR_ACTUAL_USERNAME` with your Champion Data username
- Replace `YOUR_ACTUAL_PASSWORD` with your Champion Data password
- Replace `ACTUAL_SQUAD_ID` with the Calgary Roughnecks squad ID from Step 2
- `levelId` can be left as "TBD" - the system will auto-detect the current season
- `leagueId` is `"1"` for NLL

## Step 4: Upload Configuration to S3

If you edited the file locally:

```bash
# Navigate to admin directory
cd admin

# Use the admin interface or AWS CLI to upload
aws s3 cp ../public/data/roughnecks/team-config.json \
  s3://YOUR_BUCKET_NAME/public/data/roughnecks/team-config.json
```

Or use the admin Settings interface to upload the configuration.

## Step 5: Fetch Schedule

1. Go to admin interface: `http://localhost:3000/admin`
2. Navigate to **Teams** section
3. Select **Calgary Roughnecks**
4. Click **Fetch Schedule** button
5. Wait for success message

The system will:
- Authenticate with Champion Data API
- Auto-detect the current NLL season
- Fetch all fixtures for the Roughnecks
- Save to S3 at `public/data/roughnecks/schedule.json`
- Invalidate CloudFront cache

## Step 6: Upload Opponent Logos

NLL opponent logos need to be uploaded to:
```
public/assets/opponents/nll/{SQUAD_ID}.png
```

### Finding Squad IDs

Query all NLL teams:

```bash
curl -X GET "https://api.nll.championdata.io/v1/leagues/1/squads" \
  -H "Authorization: Basic $(echo -n $USERNAME:$PASSWORD | base64)"
```

### Upload Logos

1. Collect logos for all NLL teams (PNG format, transparent background recommended)
2. Name them by squad ID (e.g., `101.png`, `102.png`)
3. Upload to S3:

```bash
aws s3 cp logo.png s3://YOUR_BUCKET/public/assets/opponents/nll/{SQUAD_ID}.png \
  --content-type image/png
```

## Step 7: Verify Schedule

1. Open `http://localhost:8000/roughnecks.html` (or your local server)
2. Verify games are displaying correctly
3. Check opponent logos are loading
4. Verify game details (home/away, dates, times)

## Troubleshooting

### Authentication Errors
- Verify username and password are correct
- Check if credentials need to be URL-encoded
- Confirm API access is active

### No Games Found
- Check if `squadId` is correct
- Verify the season is active
- Check API response in browser console or admin logs

### Missing Opponent Logos
- Ensure logos are uploaded to correct S3 path
- Verify CloudFront distribution is serving the files
- Check browser console for 404 errors

### Invalid Level ID
- Leave `levelId` as "TBD" for auto-detection
- Or manually query `/v1/leagues/1/levels` to find current season

## API Endpoints Reference

### Authentication
All requests require Basic Authentication header:
```
Authorization: Basic <base64(username:password)>
```

### Key Endpoints

**Get Leagues:**
```
GET https://api.nll.championdata.io/v1/leagues
```

**Get Levels (Seasons):**
```
GET https://api.nll.championdata.io/v1/leagues/1/levels
```

**Get All Squads:**
```
GET https://api.nll.championdata.io/v1/leagues/1/squads
```

**Get Squad Fixtures:**
```
GET https://api.nll.championdata.io/v1/leagues/1/levels/{levelId}/squads/{squadId}/fixtures
```

**Get Fixture Details:**
```
GET https://api.nll.championdata.io/v1/leagues/1/levels/{levelId}/fixtures/{fixtureId}
```

## Full API Documentation

Champion Data NLL API Swagger documentation:
https://api.nll.championdata.io/swagger/index.html

## Support

For API access issues, contact Champion Data support.

For integration issues, check:
- Browser console for JavaScript errors
- Admin logs for API errors
- Network tab for failed requests
