# League API Endpoints

## NHL (Calgary Flames)
- **Status**: ✅ Configured
- **Team**: Calgary Flames (CGY)
- **Schedule API**: `https://api-web.nhle.com/v1/club-schedule-season/CGY/20252026`
- **Team Logos**: `https://assets.nhle.com/logos/nhl/svg/{TRICODE}_light.svg`
- **Example**: `https://assets.nhle.com/logos/nhl/svg/EDM_light.svg`

## WHL (Calgary Hitmen)
- **Status**: ✅ Configured with **Automatic Multi-Season Support**
- **Team**: Calgary Hitmen (Team ID: 202)
- **Provider**: HockeyTech API

### Automatic Season Detection
**Seasons API:**
```
https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=seasons&client_code=whl&key=41b145a848f4bd67
```
Returns all available seasons with dates. System auto-filters to active seasons.

**Schedule API (per season):**
```
https://lscluster.hockeytech.com/feed/index.php?feed=statviewfeed&view=schedule&team=202&season={SEASON_ID}&month=-1&key=41b145a848f4bd67&client_code=whl
```

### How It Works
1. Queries seasons API
2. Filters by date range (6 months back, 4 months ahead)
3. Fetches schedule for each active season
4. Merges all games
5. **No manual updates required!**

### Team Logos
- **Our S3**: `https://YOUR-CLOUDFRONT-DOMAIN/assets/opponents/whl/{TEAM_ID}.png`
- **Fallback**: `https://assets.leaguestat.com/whl/logos/{TEAM_ID}.png`
- **Example**: `205.png` (Lethbridge)

### Configuration
See [HOCKEYTECH_INTEGRATION.md](./HOCKEYTECH_INTEGRATION.md) for complete setup guide.

## AHL (Calgary Wranglers)
- **Status**: 🔧 Ready for Configuration
- **Team**: Calgary Wranglers
- **Provider**: HockeyTech API (same as WHL!)

### Setup Required
Uses the **same HockeyTech API** as WHL with different credentials:

**Seasons API:**
```
https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=seasons&client_code=ahl&key={AHL_API_KEY}
```

**Schedule API:**
```
https://lscluster.hockeytech.com/feed/index.php?feed=statviewfeed&view=schedule&team={WRANGLERS_TEAM_ID}&season={SEASON_ID}&month=-1&key={AHL_API_KEY}&client_code=ahl
```

### Configuration Needed
1. Find AHL API key (check calgarywranglers.com or theahl.com)
2. Find Wranglers team ID (inspect network requests)
3. Update `public/data/wranglers/team-config.json`
4. Upload to S3
5. Click "Fetch Schedule" in admin

See [QUICK_START_WRANGLERS.md](./QUICK_START_WRANGLERS.md) for step-by-step guide.

## CFL (Calgary Stampeders)
- **Status**: ❌ Not Configured
- **Team**: Calgary Stampeders
- **Notes**: CFL.ca APIs, need to research endpoint

## NLL (Calgary Roughnecks)
- **Status**: ✅ **WORKING** - Fully Integrated
- **Team**: Calgary Roughnecks (Team ID: 524, Code: CGY)
- **Provider**: Champion Data NLL API via Auth0

### Authentication
The Champion Data API uses **OAuth2 Client Credentials via Auth0** (NOT Basic Auth!)

**Critical Details:**
- **Auth Domain**: `https://championdata.au.auth0.com`
- **Token Endpoint**: `/oauth/token`
- **Audience**: `https://api.nll.championdata.io/` (REQUIRED!)
- **Grant Type**: `client_credentials`
- **Token Lifespan**: 24 hours (86400 seconds)

### API Configuration

**Base URL:**
```
https://api.nll.championdata.io
```

**Schedule Endpoint:**
```
GET /v1/leagues/{leagueId}/levels/{levelId}/seasons/{seasonId}/schedule
```

**Example for 2025-26 Season:**
```
GET /v1/leagues/1/levels/1/seasons/225/schedule
```

### Current Configuration

```json
{
  "championData": {
    "apiBaseUrl": "https://api.nll.championdata.io",
    "authDomain": "https://championdata.au.auth0.com",
    "audience": "https://api.nll.championdata.io/",
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "leagueId": "1",
    "levelId": "1",
    "seasonId": "225",
    "teamId": "524",
    "teamCode": "CGY"
  }
}
```

### Data Structure

Unlike other APIs, NLL data is nested:
```
schedule
  └─ phases[]
      └─ weeks[]
          └─ matches[]
              ├─ squads { home, away }
              ├─ date { utcMatchStart }
              ├─ status { code, name }
              └─ venue { name }
```

### How It Works

1. **Authenticate with Auth0**
   - POST to `https://championdata.au.auth0.com/oauth/token`
   - Include `audience` parameter (critical!)
   - Get 24-hour access token

2. **Fetch Schedule**
   - GET `/v1/leagues/1/levels/1/seasons/225/schedule`
   - Use Bearer token from Auth0

3. **Process Data**
   - Extract all matches from phases > weeks > matches
   - Filter for Calgary (team ID 524 or code CGY)
   - Transform to standard format

4. **Save & Deploy**
   - Save to S3: `public/data/roughnecks/schedule.json`
   - Invalidate CloudFront cache

### Testing

```bash
# Test authentication
node admin/scripts/test-nll-oauth.js token

# View schedule
node admin/scripts/test-nll-oauth.js schedule
```

### Opponent Logos
- **Path**: `/assets/opponents/nll/{TEAM_CODE}.png`
- **Example**: `/assets/opponents/nll/SAS.png` (Saskatchewan Rush)
- Logos need to be manually uploaded for each NLL team

### Season Updates

When a new season starts, update the `seasonId`:
- 2025-26 Season: `225`
- 2026-27 Season: TBD (check API when season starts)

### API Documentation
- Swagger: https://api.nll.championdata.io/swagger/index.html
- Auth0: https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-credentials-flow

---

## Next Steps

1. ✅ NHL - Complete
2. ✅ WHL - Complete (HockeyTech with auto-season detection)
3. ✅ AHL - Ready for configuration (HockeyTech)
4. ✅ NLL - Complete (Champion Data API)
5. ⏳ CFL - Research API endpoint

