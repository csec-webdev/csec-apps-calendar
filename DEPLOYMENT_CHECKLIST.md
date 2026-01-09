# Deployment Checklist: Automatic Multi-Season System

## What Changed

✅ **Automatic Season Detection** - No more manual season ID updates!  
✅ **Multi-Season Support** - Fetches preseason, regular season, and playoffs automatically  
✅ **HockeyTech Integration** - Works for WHL (Hitmen) and AHL (Wranglers)  
✅ **Admin UI Updates** - New configuration panel for HockeyTech credentials  

## Files to Upload to S3

### 1. Updated Config Files
- [ ] `public/data/hitmen/team-config.json` (✅ Updated with HockeyTech credentials)
- [ ] `public/data/wranglers/team-config.json` (🔧 Needs AHL credentials)

### 2. Updated Code (if deploying admin)
- [ ] Admin application files (entire `/admin` folder for production deployment)

### 3. Public Files (if needed)
- [ ] `public/calendar.js` (already updated for dynamic year parsing)

## Testing Steps

### Test Hitmen (WHL) - Ready Now

1. **Upload config to S3:**
   ```bash
   aws s3 cp public/data/hitmen/team-config.json \
     s3://csec-app-calendar/public/data/hitmen/team-config.json
   ```

2. **Start admin dev server:**
   ```bash
   cd /Users/jjohnson/csec-app-calendar/admin
   npm run dev
   ```

3. **Test in admin:**
   - Go to: `http://localhost:3000/admin/teams`
   - Select: **Calgary Hitmen**
   - Verify config shows:
     - Client Code: `whl`
     - API Key: `41b145a848f4bd67`
     - Team ID: `202`
   - Click: **"Fetch Schedule from API"**
   - Expected: "Fetched ~68 games from 2 season(s): 285, 288!"

4. **Verify games:**
   - Should see games from Sep 2024 through May 2025
   - Both regular season and upcoming playoffs
   - Opponent logos should load from S3

5. **Upload to S3:**
   - Schedule will be at: `public/data/hitmen/schedule.json`
   - Already saved by fetch button

6. **Test on CloudFront:**
   - URL: `https://d37ygqmmhd03wh.cloudfront.net/hitmen.html`
   - Should show full season
   - Click games to verify modal works

### Setup Wranglers (AHL) - Needs Configuration

See [QUICK_START_WRANGLERS.md](./QUICK_START_WRANGLERS.md) for complete setup guide.

**Quick version:**
1. Find AHL API credentials (check calgarywranglers.com)
2. Update `public/data/wranglers/team-config.json`
3. Upload to S3
4. Test in admin (same steps as Hitmen)

## CloudFront Invalidations

After uploading updated files:

```
/data/hitmen/team-config.json
/data/hitmen/schedule.json
/data/wranglers/team-config.json
/data/wranglers/schedule.json
```

## Rollback Plan

If issues occur:

1. **Revert config files:**
   - Restore old `team-config.json` from S3 version history
   - Use old "seasonId" field (deprecated but still works)

2. **Admin still works:**
   - Old season ID field will be ignored
   - Just enter HockeyTech credentials and it will work

3. **Schedule data preserved:**
   - Existing `schedule.json` files not affected by code changes
   - Only regenerated when you click "Fetch Schedule"

## Benefits of New System

### Before (Manual)
❌ Update season ID annually  
❌ Miss playoff games (separate season)  
❌ Manual transition in August  
❌ Only one season at a time  

### After (Automatic)
✅ Zero manual updates  
✅ All game types included automatically  
✅ Smooth transitions  
✅ Multi-season support  
✅ Works for WHL + AHL  

## Documentation Created

- [ ] **HOCKEYTECH_INTEGRATION.md** - Complete technical guide
- [ ] **QUICK_START_WRANGLERS.md** - Step-by-step Wranglers setup
- [ ] **LEAGUE_APIS.md** - Updated with new system details
- [ ] **SEASON_MANAGEMENT.md** - Marked as deprecated
- [ ] **DEPLOYMENT_CHECKLIST.md** - This file!

## Future Work

### Immediate
- [ ] Configure Wranglers (AHL)
- [ ] Test full season transition (July-August 2025)
- [ ] Set up automated daily schedule refresh

### Later
- [ ] Apply to Roughnecks (NLL) - Need to find API
- [ ] Apply to Stampeders (CFL) - Need to find API
- [ ] Add cron job for automatic daily fetches
- [ ] Monitor season transitions

## Support

Questions? Check:
1. [HOCKEYTECH_INTEGRATION.md](./HOCKEYTECH_INTEGRATION.md) - Main guide
2. [QUICK_START_WRANGLERS.md](./QUICK_START_WRANGLERS.md) - Wranglers setup
3. [LEAGUE_APIS.md](./LEAGUE_APIS.md) - API details
4. Server logs (CloudWatch) for detailed errors

---

**Status:** ✅ Ready for Testing  
**Risk Level:** Low (rollback available)  
**Estimated Testing Time:** 30 minutes  
**Go Live:** After successful testing

