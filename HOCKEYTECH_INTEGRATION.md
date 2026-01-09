# HockeyTech API Integration Guide

This guide explains how to integrate teams using HockeyTech APIs (WHL, AHL, ECHL, etc.) with automatic multi-season support.

## Overview

HockeyTech provides unified APIs for multiple leagues:
- **WHL** (Western Hockey League) - Calgary Hitmen
- **AHL** (American Hockey League) - Calgary Wranglers  
- **ECHL**, **OHL**, **QMJHL**, etc.

All use the same API structure with different `client_code` and `key` parameters.

## How It Works

### Automatic Season Detection

The system automatically:
1. **Queries the Seasons API** to get all available seasons
2. **Filters by date range** (6 months back, 4 months ahead)
3. **Fetches schedule for each active season**
4. **Merges games** into a single schedule.json

**Result**: Zero manual season management! 🎉

### Example Timeline

**January 2025:**
- Active: Season 285 (2024-25 Regular Season)
- Active: Season 288 (2025 Playoffs) - coming soon
- **Fetches both** and merges

**August 2025:**
- Active: Season 288 (2025 Playoffs) - wrapping up
- Active: Season 290 (2025-26 Preseason) - starting
- Active: Season 289 (2025-26 Regular Season) - upcoming
- **Fetches all three** and merges

**September 2025:**
- Season 288 drops off (> 6 months old)
- Active: Season 289 (2025-26 Regular Season)
- **Automatic transition** to new season!

## Configuration

### Team Config File Structure

Location: `public/data/{teamKey}/team-config.json`

```json
{
  "hockeyTech": {
    "clientCode": "whl",
    "apiKey": "41b145a848f4bd67",
    "teamId": "202"
  },
  "lastFetchedSeasons": ["285", "288"],
  "lastUpdated": "2025-01-08T12:00:00.000Z"
}
```

### Configuration Fields

| Field | Description | Example |
|-------|-------------|---------|
| `clientCode` | League identifier | `"whl"`, `"ahl"`, `"echl"` |
| `apiKey` | HockeyTech API key | `"41b145a848f4bd67"` |
| `teamId` | Team's HockeyTech ID | `"202"` (Hitmen) |
| `lastFetchedSeasons` | Auto-updated by system | `["285", "288"]` |

## Setup Instructions

### For Calgary Hitmen (WHL) ✅ Already Configured

```json
{
  "hockeyTech": {
    "clientCode": "whl",
    "apiKey": "41b145a848f4bd67",
    "teamId": "202"
  }
}
```

### For Calgary Wranglers (AHL) 🔧 To Be Configured

1. **Find AHL API credentials:**
   - Visit: https://theahl.com/stats/schedule
   - Inspect network requests to find the API key
   - Look for: `client_code=ahl&key=XXXXX`

2. **Find Wranglers Team ID:**
   - Check Wranglers page source or API responses
   - Team ID format: Usually 3-digit number

3. **Update config:**
```json
{
  "hockeyTech": {
    "clientCode": "ahl",
    "apiKey": "YOUR_AHL_API_KEY",
    "teamId": "YOUR_WRANGLERS_TEAM_ID"
  }
}
```

4. **Upload to S3:**
   - Path: `s3://csec-app-calendar/public/data/wranglers/team-config.json`

5. **Test in Admin:**
   - Go to Admin → Teams → Calgary Wranglers
   - Click "Fetch Schedule from API"
   - Should fetch ~76 games (AHL season)

## API Endpoints

### 1. Seasons List API

**URL Format:**
```
https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=seasons&client_code={CLIENT_CODE}&key={API_KEY}
```

**Example (WHL):**
```
https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=seasons&client_code=whl&key=41b145a848f4bd67
```

**Response:**
```json
{
  "SiteKit": {
    "Seasons": [
      {
        "season_id": "285",
        "season_name": "2024 - 25 Regular Season",
        "start_date": "2024-09-20",
        "end_date": "2025-03-26",
        "career": "1",
        "playoff": "0"
      },
      {
        "season_id": "288",
        "season_name": "2025 WHL Playoffs",
        "start_date": "2025-03-28",
        "end_date": "2025-05-19",
        "career": "1",
        "playoff": "1"
      }
    ]
  }
}
```

### 2. Schedule API

**URL Format:**
```
https://lscluster.hockeytech.com/feed/index.php?feed=statviewfeed&view=schedule&team={TEAM_ID}&season={SEASON_ID}&month=-1&key={API_KEY}&client_code={CLIENT_CODE}
```

**Example (Hitmen, Season 285):**
```
https://lscluster.hockeytech.com/feed/index.php?feed=statviewfeed&view=schedule&team=202&season=285&month=-1&key=41b145a848f4bd67&client_code=whl
```

**Response:** JSONP format `([{...game data...}])`

## Season Filtering Logic

### Date Window
- **6 months back** - Includes recently completed playoffs
- **4 months ahead** - Includes upcoming preseason/schedule releases

### Filter Criteria
```javascript
function getActiveSeasonIds(seasons) {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  const fourMonthsAhead = new Date(now);
  fourMonthsAhead.setMonth(now.getMonth() + 4);
  
  return seasons.filter(season => {
    // Skip preseason-only (career=0)
    if (season.career === "0") return false;
    
    const start = new Date(season.start_date);
    const end = new Date(season.end_date);
    
    // Include if overlaps with window
    return end >= sixMonthsAgo && start <= fourMonthsAhead;
  });
}
```

### Why Skip Preseason-Only Seasons?
- Some teams have separate preseason seasons (`career="0"`)
- These are usually 5-6 exhibition games
- Regular season (`career="1"`) already includes preseason dates
- Skipping prevents duplicate games

## Admin UI Usage

### 1. Configure Team
1. Go to **Admin** → **Teams**
2. Select team (e.g., Calgary Hitmen)
3. Scroll to "HockeyTech API Configuration" (blue box)
4. Enter:
   - Client Code: `whl`
   - API Key: `41b145a848f4bd67`
   - Team ID: `202`
5. Click **"Save Config"**

### 2. Fetch Schedule
1. Click **"Fetch Schedule from API"**
2. System will:
   - Query seasons API
   - Detect active seasons (e.g., 285, 288)
   - Fetch each season's schedule
   - Merge games
   - Save to S3
   - Invalidate CloudFront
3. Toast shows: "Fetched 68 games from 2 season(s): 285, 288!"

### 3. Verify
- Check game count (should be ~68 for WHL, ~76 for AHL)
- Scroll through games - should see past, present, and future
- Check "Last fetched seasons" in config box

## Troubleshooting

### No Games Fetched
**Problem:** Zero games returned  
**Causes:**
- Wrong API key
- Wrong team ID
- Wrong client code
**Solution:** Verify credentials by testing URL in browser

### Only 5-6 Games
**Problem:** Only preseason games  
**Causes:**
- Fetching preseason-only season ID
- Date window too narrow
**Solution:** System auto-skips these now, but check date filtering logic

### Duplicate Games
**Problem:** Same game appears twice  
**Causes:**
- Multiple seasons contain same date
- JSONP parsing issue
**Solution:** Games are merged by date key, should auto-dedupe. Check date parsing.

### Old Games Not Showing
**Problem:** Missing historical games  
**Causes:**
- Date window too narrow (< 6 months back)
- Season ended > 6 months ago
**Solution:** Increase `sixMonthsAgo` window if needed

## Benefits

✅ **Zero maintenance** - No manual season updates  
✅ **Smooth transitions** - Auto-includes next season when published  
✅ **Multi-season support** - Shows past/current/future simultaneously  
✅ **Handles all game types** - Regular season + playoffs automatically  
✅ **League agnostic** - Same config works for WHL, AHL, ECHL, etc.  
✅ **Future-proof** - Works as long as HockeyTech API exists  

## Finding HockeyTech Credentials

### Method 1: Inspect Network Requests
1. Go to team's official website (e.g., `calgarywranglers.com/schedule`)
2. Open browser DevTools (F12) → Network tab
3. Look for requests to `lscluster.hockeytech.com`
4. Find `client_code` and `key` parameters

### Method 2: View Page Source
1. View page source on schedule page
2. Search for `hockeytech`, `client_code`, or `api`
3. Find embedded script with credentials

### Method 3: Check League Stats Site
1. Go to league's official stats site
2. Look for "Powered by HockeyTech" footer
3. Inspect their API calls

## Security Note

API keys in `team-config.json` are **not secret**:
- They're publicly visible in team website source
- Used for read-only schedule data
- No write permissions
- Safe to store in S3

However, best practice:
- Don't commit keys to public repos
- Use environment variables for sensitive leagues
- Rotate if compromised

## Future Enhancements

### Planned Features
- [ ] Auto-refresh schedule daily via cron
- [ ] Support for other HockeyTech leagues (ECHL, OHL, QMJHL)
- [ ] Season change notifications
- [ ] Historical season archive

### Other Leagues
This pattern can extend to:
- **CFL** (Stampeders) - Different API
- **NLL** (Roughnecks) - Different API  
- Need to find their equivalent "seasons list" endpoints

## Support

For issues or questions:
1. Check this documentation
2. Test API endpoints directly in browser
3. Verify credentials in Admin UI
4. Check CloudWatch logs for detailed errors
5. Consult HockeyTech API documentation (if available)

---

**Last Updated:** January 8, 2025  
**Applies To:** Calgary Hitmen (WHL), Calgary Wranglers (AHL)

