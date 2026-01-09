# Season Management Guide

⚠️ **DEPRECATED:** For HockeyTech leagues (WHL, AHL), see [HOCKEYTECH_INTEGRATION.md](./HOCKEYTECH_INTEGRATION.md) for the new **automatic** system.

This guide explains manual season management for teams NOT using HockeyTech APIs.

## Overview

Each team can have a configurable **Season ID** that's stored in `public/data/{teamKey}/team-config.json` and managed via the admin interface. This allows you to handle preseason, regular season, and playoffs without code changes.

## How It Works

### For WHL Teams (Calgary Hitmen)

The WHL API uses a season parameter:
- **Season 289**: 2024-2025 regular season
- **Season 290**: 2025-2026 preseason (5 games)
- **Season 291**: 2025-2026 regular season (expected)

**Important**: A single season ID typically covers preseason, regular season, AND playoffs for that season year. You generally only need to update the season ID once per year when the new season begins.

### Automatic Year Parsing

The calendar automatically determines the correct year for games based on:
- Current date
- Game month (Sep-Dec vs Jan-Apr)
- Season spans (Sep to Apr of following year)

**You don't need to worry about years** - the system handles it automatically!

## Managing Seasons in the Admin

### Step 1: Open Team Configuration
1. Go to **Admin** → **Teams**
2. Select the team (e.g., Calgary Hitmen)
3. Look for the blue "API Configuration" box

### Step 2: Update Season ID
1. Enter the new season ID (e.g., `291` for 2025-26)
2. Click **"Save Config"**
3. Click **"Fetch Schedule from API"**

### Step 3: Verify
- Check that all games loaded (should see ~68 games for WHL)
- Verify dates are correct (Sep-Dec, Jan-Apr)
- Check that both home and away games appear

## When to Update Season ID

### During Season (Sep-Apr)
✅ **No action needed** - current season ID works for all game types

### Off-Season (May-Aug)
✅ **Update once** when new season schedule is published

### Example Timeline:
```
Aug 2025: New WHL schedule released
  → Update Season ID from 289 to 291
  → Fetch schedule
  → Done for entire 2025-26 season!

Aug 2026: New WHL schedule released
  → Update Season ID from 291 to 293
  → Fetch schedule
  → Done for entire 2026-27 season!
```

## Finding the Correct Season ID

If you're unsure of the season ID:

1. **Check the WHL website** - URLs often include the season ID
2. **Try incrementing** - If current is 289, try 291 (290 is usually preseason)
3. **Test in browser**: 
   ```
   https://lscluster.hockeytech.com/feed/index.php?feed=statviewfeed&view=schedule&team=202&season=291&month=-1&key=41b145a848f4bd67&client_code=whl
   ```
4. **Count games** - Regular season should have ~68 games, preseason has 5-6

## Troubleshooting

### Only 5 games loaded
❌ **Problem**: You're using the preseason-only season ID  
✅ **Solution**: Try the next season ID number (e.g., 290 → 291)

### Wrong years showing
❌ **Problem**: Rare, but possible cache issue  
✅ **Solution**: Re-fetch schedule, clear browser cache, or check date parsing logic

### No games loaded
❌ **Problem**: Season ID doesn't exist yet or API is down  
✅ **Solution**: Wait for league to publish schedule, or check API directly

## Benefits of This System

✅ **One-time annual update** - Set season ID once per year  
✅ **All game types included** - Preseason, regular season, playoffs  
✅ **No code changes needed** - Managed entirely in admin UI  
✅ **Automatic year handling** - Calendar knows the correct year  
✅ **Team-specific** - Each team has independent config  

## Configuration Files

### Location
```
public/data/hitmen/team-config.json
public/data/wranglers/team-config.json
(etc for each team)
```

### Format
```json
{
  "seasonId": "289",
  "lastUpdated": "2025-01-08T00:00:00.000Z"
}
```

### S3 Storage
These files are stored in S3 at: `s3://csec-app-calendar/public/data/{teamKey}/team-config.json`

## Best Practices

1. **Update early** - As soon as new schedules are published
2. **Test after update** - Verify game count and dates
3. **Document changes** - Note the season ID in your records
4. **One source of truth** - Admin UI is the only place to update this
5. **Don't hardcode** - Never put season IDs in code anymore!

