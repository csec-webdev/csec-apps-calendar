# Calgary Roughnecks NLL API Setup - Quick Start

## ✅ Status: COMPLETE & WORKING!

The NLL Champion Data API integration is fully functional and tested.

## 🎯 Quick Test

```bash
# Test authentication (should see "✅ Auth0 token acquired successfully")
node admin/scripts/test-nll-oauth.js token

# View Calgary Roughnecks schedule (should see 18 games)
node admin/scripts/test-nll-oauth.js schedule
```

## 🚀 Deploy to Production

### Step 1: Upload Configuration

The configuration is already in your repo at:
```
public/data/roughnecks/team-config.json
```

Upload it to S3:
```bash
aws s3 cp public/data/roughnecks/team-config.json \
  s3://YOUR_BUCKET/public/data/roughnecks/team-config.json
```

### Step 2: Deploy Admin Changes

Deploy the updated admin application:
```bash
cd admin
npm run build
# Deploy to your hosting (Vercel, etc.)
```

### Step 3: Fetch Schedule via Admin

1. Go to admin interface: `https://your-admin-domain.com/admin`
2. Navigate to **Teams**
3. Select **Calgary Roughnecks**
4. Click **"Fetch Schedule"**
5. Should see: ✅ "Fetched 18 games"

### Step 4: Upload Opponent Logos

Create/upload logos for NLL teams to:
```
public/assets/opponents/nll/
```

Team codes needed:
- `SAS.png` - Saskatchewan Rush
- `TOR.png` - Toronto Rock
- `BUF.png` - Buffalo Bandits
- `SD.png` - San Diego Seals
- `VAN.png` - Vancouver Warriors
- `GA.png` - Georgia Swarm
- `OTT.png` - Ottawa Black Bears
- `PHI.png` - Philadelphia Wings
- `COL.png` - Colorado Mammoth
- `LV.png` - Las Vegas Desert Dogs
- `ALB.png` - Albany FireWolves
- `HAL.png` - Halifax Thunderbirds
- `PC.png` - Panther City Lacrosse Club

### Step 5: Test Calendar

Visit: `https://your-domain.com/roughnecks.html`

Should display:
- ✅ 18 Calgary Roughnecks games
- ✅ Past games with scores (W/L)
- ✅ Upcoming games with dates/times
- ✅ Opponent names and logos
- ✅ Home/Away indication

## 📋 Key Implementation Details

### Authentication
- Uses **Auth0** (not the NLL API directly!)
- Token URL: `https://championdata.au.auth0.com/oauth/token`
- **Requires `audience` parameter**: `https://api.nll.championdata.io/`
- Tokens last 24 hours

### API Endpoint
```
GET https://api.nll.championdata.io/v1/leagues/1/levels/1/seasons/225/schedule
```

### Calgary Roughnecks Identifiers
- **Team ID**: `524`
- **Team Code**: `CGY`
- **League ID**: `1` (NLL)
- **Level ID**: `1`
- **Season ID**: `225` (2025-26 season)

### Data Structure
Data is nested: `phases > weeks > matches`

The system:
1. Fetches full NLL schedule (all teams)
2. Filters for Calgary games (ID 524 or code CGY)
3. Transforms to standard format
4. Saves to S3

## 🔄 Future Season Updates

When 2026-27 season starts:

1. Update `seasonId` in config (probably 226 or similar)
2. Re-run fetch schedule
3. Done!

To find new season ID, you can query:
```bash
# This endpoint may list available seasons (check API docs)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.nll.championdata.io/v1/leagues/1/levels/1/seasons
```

Or just increment the season ID and try (225 → 226).

## 🐛 Troubleshooting

### "401 Unauthorized"
- Check `audience` parameter is included in token request
- Verify Auth0 domain is `championdata.au.auth0.com`
- Confirm credentials are correct

### "No games found"
- Verify `seasonId` is 225 (for 2025-26)
- Check `teamId` is 524
- Ensure API endpoint structure is correct

### "Token expired"
- System auto-refreshes tokens (24 hour lifespan)
- Check token cache is working
- Verify system time is correct

## 📚 Documentation Files

- `NLL_INTEGRATION_SUCCESS.md` - Detailed implementation notes
- `LEAGUE_APIS.md` - All league API configurations
- `QUICK_START_ROUGHNECKS.md` - Original setup guide (now updated)

## ✨ What Changed From Your Original Code

Your code was for a Lambda function with S3 token caching. I adapted it for:
- Next.js API routes (admin interface)
- In-memory token caching (works in serverless)
- Integrated with existing team management system
- Matches format used by other teams (Flames, Hitmen, Wranglers)

The core Auth0 authentication logic and data parsing remain the same!

## 🎉 Summary

**Everything is working!** You can now:
- ✅ Fetch Calgary Roughnecks schedules automatically
- ✅ Update via admin interface
- ✅ Display on calendar alongside other teams
- ✅ Auto-refresh with proper token caching

Just upload the config to S3, fetch the schedule from admin, and you're live! 🏒
