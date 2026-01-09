# CSEC Apps Calendar

Multi-team sports calendar system for Calgary Sports and Entertainment Corporation teams.

## 🏒 Teams

- **Calgary Flames** (NHL)
- **Calgary Hitmen** (WHL)
- **Calgary Wranglers** (AHL)
- **Calgary Roughnecks** (NLL)
- **Calgary Stampeders** (CFL) - Coming soon

## 📋 Features

- ✅ Live game scores and results
- ✅ Interactive monthly calendar view
- ✅ Game details modal with team logos
- ✅ Deep linking to mobile apps
- ✅ Sponsor integration
- ✅ Custom ticket links
- ✅ Automatic schedule updates every hour
- ✅ Admin interface for schedule management

## 🏗️ Architecture

### Frontend
- Static HTML/CSS/JavaScript calendars
- Served via AWS CloudFront CDN
- Mobile-optimized responsive design

### Backend (Admin)
- Next.js 14 with App Router
- TypeScript
- Azure AD authentication
- AWS S3 for data storage
- Automated API integrations

### Data Sources
- **NHL API**: Official NHL schedule and scores
- **HockeyTech API**: WHL and AHL schedules
- **Champion Data API**: NLL schedules (OAuth2 via Auth0)
- **CFL API**: Coming soon

## 🚀 Quick Start

### Frontend (Local Development)

```bash
# Serve the public folder
python3 -m http.server 8000

# Or use any static file server
npx serve public
```

Visit:
- http://localhost:8000/flames.html
- http://localhost:8000/hitmen.html
- http://localhost:8000/wranglers.html
- http://localhost:8000/roughnecks.html

### Admin Interface

```bash
cd admin

# Install dependencies
npm install

# Copy environment template
cp env.local.example .env.local

# Edit .env.local with your credentials
# (AWS, Azure AD, etc.)

# Start development server
npm run dev
```

Visit: http://localhost:3000/admin

## 📚 Documentation

- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Production deployment guide
- **[AUTOMATED_SCHEDULE_UPDATES.md](./AUTOMATED_SCHEDULE_UPDATES.md)** - Cron job setup
- **[LEAGUE_APIS.md](./LEAGUE_APIS.md)** - API integration details
- **[NLL_INTEGRATION_SUCCESS.md](./NLL_INTEGRATION_SUCCESS.md)** - NLL setup guide
- **[HOCKEYTECH_INTEGRATION.md](./HOCKEYTECH_INTEGRATION.md)** - WHL/AHL setup
- **[SEASON_MANAGEMENT.md](./SEASON_MANAGEMENT.md)** - Season updates

## 🔄 Automated Updates

Schedules automatically update every hour via cron job:
- Fetches latest scores and results
- Updates game states (Scheduled → Live → Final)
- Syncs schedule changes
- Runs on Vercel Cron (or AWS EventBridge)

See [CRON_QUICK_START.md](./CRON_QUICK_START.md) for setup.

## 🔐 Environment Variables

Required for admin interface:

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Azure AD (Authentication)
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret

# AWS (S3 & CloudFront)
AWS_REGION=ca-central-1
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
CLOUDFRONT_DISTRIBUTION_ID=your-distribution-id
CLOUDFRONT_DOMAIN=your-cloudfront-domain

# Cron (Optional - for manual triggers)
CRON_SECRET=your-cron-secret
```

See `admin/env.local.example` for complete template.

## 📦 Project Structure

```
csec-app-calendar/
├── admin/                      # Next.js admin interface
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/         # Admin pages
│   │   │   └── api/           # API routes
│   │   ├── components/        # React components
│   │   └── lib/               # Utilities (S3, auth, etc.)
│   ├── scripts/               # Helper scripts
│   └── vercel.json            # Cron configuration
│
├── public/                     # Static frontend
│   ├── assets/
│   │   ├── opponents/         # Team logos
│   │   └── teams/             # Team logos
│   ├── data/                  # Schedule JSON files
│   │   ├── flames/
│   │   ├── hitmen/
│   │   ├── wranglers/
│   │   └── roughnecks/
│   ├── calendar.js            # Main calendar logic
│   ├── styles.css             # Styles
│   └── *.html                 # Team-specific pages
│
└── docs/                       # Documentation (markdown files)
```

## 🔧 Admin Features

- **Teams Management**: View and manage all team schedules
- **Schedule Fetching**: Pull latest data from league APIs
- **Custom Tickets**: Add custom ticket links per game
- **Sponsors**: Manage sponsor placements
- **Settings**: Configure team-specific API settings
- **Access Control**: Email allowlist for admin access

## 🎨 Customization

### Team Colors

See [TEAM_COLORS.md](./TEAM_COLORS.md) for team-specific color schemes.

### Team Logos

Upload logos to:
- `public/assets/teams/{team}/logo.png` - Team logo
- `public/assets/opponents/{league}/{id}.png` - Opponent logos

See [TEAM_LOGOS.md](./TEAM_LOGOS.md) for details.

## 🚀 Deployment

### Vercel (Recommended for Admin)

```bash
cd admin
vercel --prod
```

Vercel automatically:
- Builds the Next.js app
- Sets up cron jobs from `vercel.json`
- Configures environment variables

### AWS S3 + CloudFront (Frontend)

```bash
# Sync public files to S3
aws s3 sync public/ s3://your-bucket/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for complete guide.

## 🧪 Testing

### Test Cron Job

```bash
cd admin
./scripts/test-cron-fetch.sh
```

### Test Individual Team APIs

```bash
# NHL (Flames)
curl https://api-web.nhle.com/v1/club-schedule-season/CGY/20252026

# HockeyTech (Hitmen/Wranglers)
cd admin
./scripts/query-nll-api.sh

# NLL (Roughnecks)
cd admin
node scripts/test-nll-oauth.js schedule
```

## 📝 License

Proprietary - Calgary Sports and Entertainment Corporation

## 🤝 Contributing

Internal project. Contact CSEC Web Development team for access.

## 📞 Support

For issues or questions, contact the CSEC Web Development team.

---

**Built with ❤️ for Calgary Sports and Entertainment Corporation**
