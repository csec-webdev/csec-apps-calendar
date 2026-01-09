# CSEC Calendar Admin Dashboard

A modern, clean admin interface for managing CSEC team calendars, sponsors, and ticket links.

## Features

### 🎨 Modern UI/UX
- Clean, responsive Tailwind CSS design
- Sidebar navigation with visual indicators
- Toast notifications for user feedback
- Loading states and error handling
- Mobile-friendly responsive layout

### 📊 Dashboard
- Overview of all teams and their data
- Quick stats (total games, sponsors, ticket links)
- Team-by-team breakdown
- Quick action cards

### 🏒 Team Management
- Multi-team support (Flames, Hitmen, Roughnecks, Stampeders, Wranglers)
- Search and filter games
- Per-game sponsor management:
  - Custom sponsor labels
  - Logo URL input or file upload
  - Preview uploaded logos
- Per-game custom ticket links
- Bulk save operations

### 🔐 Access Control
- SuperAdmin and Admin roles
- User management interface
- Promote/demote users
- Safety guardrails (must keep at least 1 SuperAdmin)

### ☁️ Infrastructure
- S3 integration for file uploads and data storage
- CloudFront cache invalidation after saves
- Entra ID (Azure AD) authentication
- Role-based access control

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env.local.example` to `.env.local` and fill in:
   - Entra (Azure AD) credentials
   - AWS S3 bucket and credentials
   - CloudFront distribution ID (optional)
   - NextAuth secret

3. **Start dev server:**
   ```bash
   npm run dev -- --port 3000
   ```

4. **Access the admin:**
   Navigate to `http://localhost:3000/admin`

## Environment Variables

### Required
- `NEXTAUTH_URL` - Your app URL (e.g., `http://localhost:3000`)
- `NEXTAUTH_SECRET` - Secret for JWT signing
- `AZURE_AD_TENANT_ID` - Your Entra tenant ID
- `AZURE_AD_CLIENT_ID` - App registration client ID
- `AZURE_AD_CLIENT_SECRET` - App registration client secret
- `AWS_S3_BUCKET` - S3 bucket name
- `AWS_REGION` - AWS region (e.g., `ca-central-1`)
- `AWS_ACCESS_KEY_ID` - IAM user access key
- `AWS_SECRET_ACCESS_KEY` - IAM user secret key

### Optional
- `ALLOWED_TENANT_ID` - Restrict sign-ins to specific tenant
- `CLOUDFRONT_DISTRIBUTION_ID` - For cache invalidation
- `CLOUDFRONT_DOMAIN` - CDN domain for uploaded assets

## Architecture

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **Auth:** NextAuth.js with Entra ID provider
- **Storage:** AWS S3
- **CDN:** CloudFront
- **Validation:** Zod schemas

## Deployment

Ready to deploy to Vercel:

1. Connect your repo to Vercel
2. Set all environment variables
3. Add production redirect URI in Entra App Registration
4. Deploy!

## Team Logos

Team logos should be uploaded to S3 at:
```
s3://csec-app-calendar/public/assets/teams/{teamKey}/logo.png
```

Required logos:
- `public/assets/teams/flames/logo.png`
- `public/assets/teams/hitmen/logo.png`
- `public/assets/teams/roughnecks/logo.png`
- `public/assets/teams/stampeders/logo.png`
- `public/assets/teams/wranglers/logo.png`

See [TEAM_LOGOS.md](../TEAM_LOGOS.md) in the repo root for detailed upload instructions.

## Design System

- **Primary Color**: CSEC Red `#C8102E`
- **Dark Accent**: `#A00D25`
- **Light Accent**: `#E01E3A`
- **Icons**: Custom SVG icon set (no emojis)
- **Typography**: Geist Sans (system font stack fallback)

## Security

- Email-based allowlist stored in S3
- Role-based access (SuperAdmin, Admin)
- Tenant validation for Entra sign-ins
- Private data kept outside public CloudFront path
- IAM user with least-privilege permissions
