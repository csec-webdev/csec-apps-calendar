# Automated Schedule Updates

This system automatically fetches schedules every hour to update scores, game results, and schedule changes.

## 🎯 What Gets Updated

Every hour, the system fetches fresh data for:
- ✅ **Calgary Flames** (NHL API)
- ✅ **Calgary Hitmen** (HockeyTech WHL API)
- ✅ **Calgary Wranglers** (HockeyTech AHL API)
- ✅ **Calgary Roughnecks** (Champion Data NLL API)

### What's Updated:
- Live game scores
- Final game results (W/L/OTL/SOL)
- Game state changes (Scheduled → Live → Final)
- Schedule changes (postponed, rescheduled games)
- Opponent information
- Broadcast details

## 🚀 Setup Options

### Option 1: Vercel Cron (Recommended)

If deploying to Vercel, the cron job is automatically configured.

**Configuration file:** `admin/vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-all-schedules",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Schedule:** Runs at the top of every hour (`:00`)

**Setup:**
1. Deploy admin to Vercel
2. Vercel automatically recognizes `vercel.json`
3. Cron job starts running automatically
4. View logs in Vercel dashboard

**No additional configuration needed!**

---

### Option 2: AWS EventBridge (For AWS-hosted deployments)

If self-hosting or using AWS infrastructure:

#### Step 1: Add CRON_SECRET to Environment Variables

```bash
# Generate a secure secret
CRON_SECRET=$(openssl rand -hex 32)
echo "CRON_SECRET=$CRON_SECRET"

# Add to your environment variables
```

#### Step 2: Create EventBridge Rule

**AWS Console:**
1. Go to AWS EventBridge → Rules
2. Click "Create rule"
3. Name: `schedule-fetcher-hourly`
4. Rule type: Schedule
5. Schedule pattern: `cron(0 * * * ? *)` (every hour at :00)
6. Target: API destination
7. URL: `https://your-admin-domain.com/api/cron/fetch-all-schedules`
8. Method: GET
9. Headers:
   - Key: `Authorization`
   - Value: `Bearer YOUR_CRON_SECRET`

**AWS CLI:**
```bash
# Create the rule
aws events put-rule \
  --name schedule-fetcher-hourly \
  --schedule-expression "cron(0 * * * ? *)" \
  --state ENABLED

# Add HTTP target
aws events put-targets \
  --rule schedule-fetcher-hourly \
  --targets '[
    {
      "Id": "1",
      "Arn": "arn:aws:events:REGION:ACCOUNT:api-destination/schedule-fetcher",
      "HttpParameters": {
        "HeaderParameters": {
          "Authorization": "Bearer YOUR_CRON_SECRET"
        }
      }
    }
  ]'
```

---

### Option 3: GitHub Actions

For GitHub-hosted projects:

**File:** `.github/workflows/fetch-schedules.yml`

```yaml
name: Fetch Schedules

on:
  schedule:
    # Run every hour
    - cron: '0 * * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch schedules
        run: |
          curl -X GET "https://your-admin-domain.com/api/cron/fetch-all-schedules" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

### Option 4: Simple Cron Job (Linux Server)

If running on a Linux server:

```bash
# Edit crontab
crontab -e

# Add this line (runs every hour)
0 * * * * curl -X GET "https://your-admin-domain.com/api/cron/fetch-all-schedules" -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 🧪 Testing

### Manual Trigger (Local Development)

```bash
# Set CRON_SECRET in your .env.local
echo "CRON_SECRET=your-test-secret-here" >> admin/.env.local

# Trigger manually
curl -X GET "http://localhost:3000/api/cron/fetch-all-schedules" \
  -H "Authorization: Bearer your-test-secret-here"
```

### Check Response

Successful response:
```json
{
  "success": true,
  "timestamp": "2026-01-09T20:00:00.000Z",
  "totalDuration": 3500,
  "summary": {
    "successful": 4,
    "failed": 0,
    "total": 4
  },
  "results": [
    {
      "teamKey": "flames",
      "success": true,
      "gamesCount": 82,
      "duration": 850
    },
    {
      "teamKey": "hitmen",
      "success": true,
      "gamesCount": 68,
      "duration": 1200
    },
    {
      "teamKey": "wranglers",
      "success": true,
      "gamesCount": 72,
      "duration": 950
    },
    {
      "teamKey": "roughnecks",
      "success": true,
      "gamesCount": 18,
      "duration": 500
    }
  ]
}
```

---

## 📊 Monitoring

### Vercel Dashboard
- Go to your Vercel project
- Click "Deployments"
- Select "Functions"
- View cron execution logs

### View Logs

**Successful fetch:**
```
🔄 Starting automated schedule fetch...
[flames] Starting schedule fetch...
[flames] ✅ Success: 82 games (850ms)
[hitmen] Starting schedule fetch...
[hitmen] ✅ Success: 68 games (1200ms)
[wranglers] Starting schedule fetch...
[wranglers] ✅ Success: 72 games (950ms)
[roughnecks] Starting schedule fetch...
[roughnecks] ✅ Success: 18 games (500ms)
✅ Completed: 4 successful, 0 failed (3500ms)
```

**Failed fetch:**
```
[flames] Starting schedule fetch...
[flames] ❌ Error: NHL API returned 503
```

---

## ⚙️ Configuration

### Change Fetch Frequency

Edit `admin/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-all-schedules",
      "schedule": "0 * * * *"     // Every hour at :00
      // OR
      "schedule": "*/30 * * * *"   // Every 30 minutes
      // OR
      "schedule": "0 */2 * * *"    // Every 2 hours
      // OR
      "schedule": "0 9-23 * * *"   // Every hour between 9am-11pm
    }
  ]
}
```

### Change Which Teams to Fetch

Edit `admin/src/app/api/cron/fetch-all-schedules/route.ts`:

```typescript
// Configuration
const TEAMS_TO_FETCH = ["flames", "hitmen", "wranglers", "roughnecks"] as const;

// To exclude a team:
const TEAMS_TO_FETCH = ["flames", "hitmen"] as const;

// To add stampeders (once API is configured):
const TEAMS_TO_FETCH = ["flames", "hitmen", "wranglers", "roughnecks", "stampeders"] as const;
```

---

## 🔐 Security

### CRON_SECRET

The `CRON_SECRET` environment variable protects the endpoint from unauthorized access.

**Generate a secure secret:**
```bash
openssl rand -hex 32
```

**Add to environment variables:**
- Vercel: Project Settings → Environment Variables
- AWS: Systems Manager → Parameter Store
- Local: `admin/.env.local`

### Vercel Cron

Vercel Cron requests are automatically authenticated and don't require `CRON_SECRET`.

---

## 🚨 Troubleshooting

### Cron Not Running

**Vercel:**
1. Check `vercel.json` is in the `admin` directory
2. Redeploy after adding `vercel.json`
3. Check Vercel dashboard for cron logs

**AWS EventBridge:**
1. Verify rule is enabled
2. Check CloudWatch Logs
3. Verify Authorization header is correct

### Failed Fetches

**Check API keys:**
- NHL: No key required
- HockeyTech: Verify `apiKey` in team-config.json
- Champion Data: Verify OAuth credentials

**Check S3 permissions:**
- Verify AWS credentials have S3 write access
- Check bucket name is correct

**Check network:**
- Ensure serverless function can reach external APIs
- Verify no firewall/VPC restrictions

### Partial Failures

If some teams succeed and others fail:
- Check individual team configurations
- Verify API keys for failing teams
- Check API status pages for outages

---

## 💡 Best Practices

### Timing
- **Hourly** is recommended for live scores during games
- **Every 2-4 hours** is sufficient during off-season
- **More frequent** (30 min) during playoffs/critical games

### Cost Optimization
- Each fetch = 4 API calls (one per team)
- Vercel: 100 cron executions/month free, then $0.40/100 invocations
- AWS: EventBridge is very cheap (~$1/million invocations)

### Monitoring
- Set up alerts for failed fetches
- Monitor API rate limits
- Track execution duration

---

## 📈 Future Enhancements

- [ ] Smart frequency (more frequent during game days)
- [ ] Webhook support for instant updates
- [ ] Selective team updates (only fetch if games today)
- [ ] Retry logic for failed API calls
- [ ] Health check endpoint
- [ ] Slack/email notifications for failures

---

## 🎯 Summary

**Automatic schedule updates are now running!**

✅ Fresh data every hour  
✅ Live scores updated automatically  
✅ No manual intervention needed  
✅ All teams stay in sync  

The system will keep your calendars up-to-date with the latest scores and schedule changes automatically! 🏒
