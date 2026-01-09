# csec-app-calendar (V2) — TODO

## Setup (local + AWS)
- [ ] **Create v2 S3 bucket**: `csec-app-calandar` (region `ca-central-1`)
- [ ] **Create initial allowlist file**: upload `allowed-emails.json` to the bucket root
- [ ] **Create IAM user/key** for v2 admin (least privilege to v2 bucket + optional CloudFront invalidation)
- [ ] **Create Entra App Registration** (single-tenant) for the admin app
  - [ ] Add localhost redirect URI for NextAuth callback
  - [ ] Ensure `email` claim is available

## Admin app (Next.js on Vercel later; local first)
- [ ] **Create** `admin/.env.local` from `admin/env.local.example`
- [ ] **Start admin locally**: `cd admin && npm run dev -- --port 3000`
- [ ] **Verify sign-in flow** works with Entra
- [ ] **Verify allowlist enforcement**:
  - [ ] non-allowlisted user gets `/unauthorized`
  - [ ] allowlisted Admin can access `/admin`
  - [ ] SuperAdmin can access `/admin/access` and edit allowlist
  - [ ] Guardrail enforced: must keep at least 1 SuperAdmin

## Public calendar v2 (keep V1 layout identical)
- [ ] **Confirm Flames v2 looks identical to V1** (pixel check)
- [ ] **Confirm per-team data paths** work:
  - [ ] `data/flames/*` loads and renders
  - [ ] other teams show “Schedule source not configured…” until seeded

## S3 object layout (v2 bucket)
- [ ] Create folders/keys (in S3):
  - [ ] `data/{teamKey}/schedule.json`
  - [ ] `data/{teamKey}/sponsors.json`
  - [ ] `data/{teamKey}/custom-tickets.json`
  - [ ] `sponsors/{teamKey}/...` (uploaded sponsor logos)
  - [ ] `assets/teams/{teamKey}/logo-light.(svg|png)`
  - [ ] `assets/teams/{teamKey}/logo-dark.(svg|png)` (optional)
  - [ ] `assets/opponents/{leagueKey}/{tricode}/logo.(svg|png)`

## Logos (bulk upload plan)
- [ ] **Opponent logos** (S3-hosted, single logo per opponent)
  - [ ] Bulk upload naming: `{leagueKey}_{tricode}.svg|png`
- [ ] **CSEC team logos** (light/dark variants where needed)
  - [ ] Bulk naming: `team_{teamKey}_light.*`, `team_{teamKey}_dark.*`

## Team API Configuration
- [ ] **Configure Roughnecks schedule API call**
  - [ ] Add NLL API endpoint configuration
  - [ ] Set up team config in Settings page
  - [ ] Test schedule fetch and data processing

## Calendar Features
- [ ] **Build "Add to Calendar" subscription file (.ics)**
  - [ ] Generate .ics files for each team using calendar data
  - [ ] Include all games with proper timezone handling
  - [ ] Host .ics files on CloudFront for subscription
  - [ ] Add "Subscribe" button to public calendars

## Automation & Deployment
- [ ] **Setup hourly schedule update function**
  - [ ] Create Lambda function (or alternative) to fetch all team schedules
  - [ ] Configure hourly trigger (CloudWatch Events)
  - [ ] Update schedule.json files in S3 automatically
  - [ ] Add error notifications for failed fetches

## Deployment (later, do not impact V1 Flames)
- [ ] **Create v2 CloudFront distribution** for public calendar/JSON/assets (separate from v1)
- [ ] Upload `public/` to v2 S3 bucket
- [ ] Validate v2 public URLs:
  - [ ] `.../flames.html`, `.../stampeders.html`, etc.

## Vercel + domain (later)
- [ ] Deploy `admin/` to Vercel
- [ ] Set `teamcalendars.csec360.com` (Cloudflare DNS-only / unproxied) → Vercel
- [ ] Add production redirect URI(s) in Entra for the Vercel domain


