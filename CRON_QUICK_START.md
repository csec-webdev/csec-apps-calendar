# Automated Schedule Updates - Quick Start

## ✅ What Was Created

1. **API Endpoint**: `/api/cron/fetch-all-schedules`
   - Fetches schedules for all 4 teams
   - Updates S3 data
   - Invalidates CloudFront cache
   
2. **Vercel Cron Config**: `admin/vercel.json`
   - Runs every hour at :00
   - Automatically activated on Vercel deploy

3. **Test Script**: `admin/scripts/test-cron-fetch.sh`
   - Test the endpoint locally or in production

## 🚀 Deploy (Vercel - Recommended)

### Step 1: Add to Git
```bash
cd admin
git add vercel.json src/app/api/cron/
git commit -m "Add automated schedule fetcher"
git push
```

### Step 2: Deploy to Vercel
```bash
vercel --prod
```

### Step 3: Done!
The cron job is automatically activated. Schedules will update every hour.

### Step 4: Verify (Optional)
Check Vercel Dashboard:
- Go to your project
- Click "Deployments" → "Functions"
- View cron execution logs

---

## 🧪 Test Locally

### Step 1: Add Secret
```bash
# Add to admin/.env.local
echo "CRON_SECRET=test-secret-123" >> admin/.env.local
```

### Step 2: Start Dev Server
```bash
cd admin
npm run dev
```

### Step 3: Run Test
```bash
# In another terminal
cd admin
./scripts/test-cron-fetch.sh http://localhost:3000/api/cron/fetch-all-schedules test-secret-123
```

Expected output:
```
✅ Success!

Response:
{
  "success": true,
  "timestamp": "2026-01-09T20:00:00.000Z",
  "totalDuration": 3500,
  "summary": {
    "successful": 4,
    "failed": 0,
    "total": 4
  },
  "results": [...]
}
```

---

## 📊 What Happens Every Hour

1. **Cron triggers** at :00 (e.g., 1:00, 2:00, 3:00...)
2. **Fetches data** from all league APIs:
   - Flames: NHL API
   - Hitmen: HockeyTech WHL
   - Wranglers: HockeyTech AHL
   - Roughnecks: Champion Data NLL
3. **Updates S3** with latest schedules
4. **Invalidates cache** so users see fresh data
5. **Takes ~3-5 seconds** total

---

## 🔧 Customization

### Change Frequency

Edit `admin/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-all-schedules",
      "schedule": "*/30 * * * *"   // Every 30 minutes
    }
  ]
}
```

Common schedules:
- `0 * * * *` - Every hour (current)
- `*/30 * * * *` - Every 30 minutes
- `0 */2 * * *` - Every 2 hours
- `0 9-23 * * *` - Every hour, 9am-11pm only

### Remove a Team

Edit `admin/src/app/api/cron/fetch-all-schedules/route.ts`:

```typescript
// Line 21: Remove teams you don't want to fetch
const TEAMS_TO_FETCH = ["flames", "hitmen"] as const;
```

---

## 🚨 Troubleshooting

### "Unauthorized" Error
- Add `CRON_SECRET` to environment variables
- Or deploy to Vercel (auto-authenticated)

### Some Teams Fail
- Check team-config.json is in S3
- Verify API keys are correct
- Check API status pages

### Not Running on Vercel
- Ensure `vercel.json` is in `admin` directory
- Redeploy after adding `vercel.json`
- Check Functions logs in Vercel dashboard

---

## 📚 Full Documentation

See `AUTOMATED_SCHEDULE_UPDATES.md` for:
- AWS EventBridge setup
- GitHub Actions alternative
- Advanced configuration
- Monitoring and alerts

---

## 🎯 Summary

**Schedules now update automatically every hour!**

✅ Live scores  
✅ Game results  
✅ Schedule changes  
✅ Zero manual work  

Just deploy to Vercel and forget about it! 🚀
