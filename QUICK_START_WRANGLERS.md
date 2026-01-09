# Quick Start: Calgary Wranglers (AHL) Setup

Follow these steps to configure the Calgary Wranglers calendar with automatic season detection.

## Prerequisites

- Admin access to the CSEC Calendar Admin
- Access to upload files to S3
- Calgary Wranglers AHL API credentials

## Step 1: Find AHL API Credentials

### Option A: Check Wranglers Website
1. Go to https://www.calgarywranglers.com/schedule
2. Open DevTools (F12) → Network tab
3. Refresh page
4. Look for requests to `lscluster.hockeytech.com`
5. Find parameters:
   - `client_code=ahl`
   - `key=XXXXXXXXXXXXX`
   - `team=XXX`

### Option B: Check AHL Stats Site
1. Go to https://theahl.com/stats
2. Navigate to Calgary Wranglers schedule
3. Inspect network requests
4. Find HockeyTech API calls

### Expected Values
- **Client Code**: `ahl`
- **API Key**: 16-character string (e.g., `41b145a848f4bd67`)
- **Team ID**: 3-digit number (e.g., `501` or similar)

## Step 2: Update Team Config

### Edit Local File
Edit: `/Users/jjohnson/csec-app-calendar/public/data/wranglers/team-config.json`

```json
{
  "hockeyTech": {
    "clientCode": "ahl",
    "apiKey": "YOUR_AHL_API_KEY_HERE",
    "teamId": "YOUR_WRANGLERS_TEAM_ID_HERE"
  },
  "lastFetchedSeasons": [],
  "lastUpdated": "2025-01-08T00:00:00.000Z"
}
```

Replace:
- `YOUR_AHL_API_KEY_HERE` with the actual AHL API key
- `YOUR_WRANGLERS_TEAM_ID_HERE` with the Wranglers team ID

## Step 3: Upload to S3

### Via AWS Console
1. Go to S3 Console
2. Navigate to bucket: `csec-app-calendar`
3. Navigate to folder: `public/data/wranglers/`
4. Upload `team-config.json`

### Via AWS CLI
```bash
aws s3 cp /Users/jjohnson/csec-app-calendar/public/data/wranglers/team-config.json \
  s3://csec-app-calendar/public/data/wranglers/team-config.json
```

## Step 4: Test in Admin

1. **Start Admin Dev Server** (if not running):
   ```bash
   cd /Users/jjohnson/csec-app-calendar/admin
   npm run dev
   ```

2. **Go to Admin UI**:
   - Open: http://localhost:3000/admin/teams
   - Select: **Calgary Wranglers**

3. **Verify Config Loaded**:
   - Scroll to "HockeyTech API Configuration" (blue box)
   - Should show your clientCode, apiKey, teamId
   - If empty, click "Reload Data"

4. **Fetch Schedule**:
   - Click **"Fetch Schedule from API"**
   - Wait for success message
   - Should say: "Fetched XX games from X season(s): XXX, XXX!"
   - Expected: ~76 games for full AHL season

5. **Verify Games**:
   - Scroll down to games list
   - Should see AHL opponents (e.g., Abbotsford, Coachella Valley, etc.)
   - Check dates range from Sep/Oct through Apr/May

## Step 5: Upload Team Logo (If Needed)

If the Wranglers logo isn't already in S3:

1. **Prepare Logo**:
   - File: `logo.png`
   - Format: PNG with transparent background
   - Size: 500x500px recommended

2. **Upload to S3**:
   - Path: `s3://csec-app-calendar/public/assets/teams/wranglers/logo.png`

3. **Upload to Local** (for testing):
   - Path: `/Users/jjohnson/csec-app-calendar/public/assets/teams/wranglers/logo.png`

## Step 6: Create Public HTML Page (If Needed)

If `wranglers.html` doesn't exist:

Create: `/Users/jjohnson/csec-app-calendar/public/wranglers.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calgary Wranglers Schedule</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</head>
<body>
    <div id="calendarGrid"></div>
    <div id="gameModal" class="modal">
        <!-- Modal content populated by JavaScript -->
    </div>
    
    <script>
        window.__TEAM_KEY__ = 'wranglers';
        window.__LEAGUE_KEY__ = 'ahl';
    </script>
    <script src="calendar.js"></script>
</body>
</html>
```

Upload to S3: `public/wranglers.html`

## Step 7: Test on CloudFront

1. **Upload all files to S3**:
   - `public/wranglers.html`
   - `public/data/wranglers/schedule.json` (created by fetch)
   - `public/data/wranglers/team-config.json`
   - `public/assets/teams/wranglers/logo.png`

2. **Invalidate CloudFront**:
   - Path: `/wranglers.html`
   - Path: `/data/wranglers/*`
   - Path: `/assets/teams/wranglers/*`

3. **Test URL**:
   ```
   https://YOUR-CLOUDFRONT-DOMAIN/wranglers.html
   ```

4. **Verify**:
   - Page loads
   - Wranglers logo shows
   - Games displayed
   - Opponent logos show (if uploaded)
   - Click game → Modal shows correct info

## Troubleshooting

### No Games Fetched
**Problem:** Zero games or error message  
**Solution:**
- Verify API credentials are correct
- Test seasons API in browser:
  ```
  https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=seasons&client_code=ahl&key=YOUR_KEY
  ```
- Check team ID is correct

### Wrong Games Showing
**Problem:** Games from wrong team  
**Solution:**
- Verify Team ID is for Calgary Wranglers, not another AHL team

### Old Config Still Showing
**Problem:** Changes not reflected in admin  
**Solution:**
- Click "Reload Data" button
- Clear browser cache
- Check S3 file was actually uploaded

## Maintenance

### Zero Maintenance Required! 🎉

Once configured:
- ✅ Seasons auto-detected
- ✅ Preseason, regular season, playoffs all included
- ✅ Automatic transition to next season
- ✅ No manual updates needed

### Only Update If:
- AHL changes API structure
- Wranglers change team ID (rare)
- API key expires (unlikely)

## Next Steps

After Wranglers are working:
1. Apply same pattern to Roughnecks (NLL)
2. Apply to Stampeders (CFL)
3. Set up automated daily schedule refresh

## Support

See full documentation:
- [HOCKEYTECH_INTEGRATION.md](./HOCKEYTECH_INTEGRATION.md) - Complete HockeyTech guide
- [LEAGUE_APIS.md](./LEAGUE_APIS.md) - All league API details
- [TEAM_COLORS.md](./TEAM_COLORS.md) - Team colors configuration

---

**Estimated Time:** 15-30 minutes  
**Difficulty:** Easy  
**One-Time Setup:** Yes

