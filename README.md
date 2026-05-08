# ColdCRM — Full-Stack Cold Calling System

Find businesses on Google Maps that need your service, book Zoom calls, send automated follow-ups, and track every deal in a Kanban pipeline.

---

## What's Built

| Feature | Description |
|---|---|
| **Google Maps Scraper** | Playwright scrapes 50 leads per scan — name, phone, website, rating, reviews, address |
| **Lead Scoring** | A+ to C scoring based on: no website (+40), no Google Ads (+25), high rating (+20), reviews (+15), phone (+10) |
| **Website Checker** | HEAD requests verify if listed website is alive or dead |
| **Google Ads Detector** | SerpAPI checks if business runs paid search |
| **AI Call Scripts** | Claude generates personalized scripts per business (tone: Professional / Casual / Aggressive) |
| **AI Website Prompt** | One-click website build prompt tailored to the exact business |
| **Zoom Booking** | OAuth → create 5-min meetings directly to your Zoom calendar |
| **Follow-up 1** | Email sent immediately after booking (personalized by Claude) |
| **Follow-up 2** | Email sent 90 min before meeting (reminder + Zoom link) |
| **SMS Follow-ups** | Optional Twilio SMS alongside email |
| **Kanban Pipeline** | Drag-and-drop: New → Called → Booked → Showed → Closed / No-show |
| **Daily Metrics** | Calls, booked, showed, closed ($), no-shows — resets midnight |
| **CSV Export** | One-click download of full pipeline |
| **Auth** | Supabase email/password + magic link + Google OAuth |
| **Free Plan Limits** | 10 scans/day — enforced server-side |

---

## Quick Start

### 1. Clone and install
```bash
git clone <your-repo>
cd cold-calling-crm
npm install
```

### 2. Set up environment
```bash
cp .env.example .env.local
# Fill in all values — see notes below
```

### 3. Set up Supabase
1. Create project at [supabase.com](https://supabase.com)
2. Copy your Project URL and anon key into `.env.local`
3. Run database migrations:
```bash
npx prisma db push
```
4. Open Supabase SQL editor and paste contents of `prisma/rls.sql` — this sets up Row Level Security
5. In Supabase → Auth → Providers: enable Google OAuth (optional)

### 4. Set up Zoom OAuth App
1. Go to [marketplace.zoom.us](https://marketplace.zoom.us)
2. Create an OAuth app (not JWT)
3. Set redirect URI to: `http://localhost:3000/api/zoom/callback`
4. Scopes needed: `meeting:write:admin`, `meeting:write`
5. Copy Client ID + Secret to `.env.local`

### 5. Set up Resend (email)
1. Sign up at [resend.com](https://resend.com)
2. Add and verify your domain
3. Copy API key to `.env.local`

### 6. (Optional) Twilio SMS
1. Sign up at [twilio.com](https://twilio.com)
2. Get a phone number
3. Copy Account SID + Auth Token + phone number to `.env.local`

### 7. (Optional) SerpAPI for Google Ads detection
1. Sign up at [serpapi.com](https://serpapi.com)
2. Copy API key to `.env.local`
3. Without this, Google Ads detection defaults to "not running ads"

### 8. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

```
DATABASE_URL          Supabase Postgres (pooled, port 6543)
DIRECT_URL            Supabase Postgres (direct, port 5432)  
NEXT_PUBLIC_SUPABASE_URL    Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   Supabase anon key
SUPABASE_SERVICE_ROLE_KEY   Supabase service role key (server-only)
ANTHROPIC_API_KEY     Your Claude API key (get at console.anthropic.com)
ZOOM_CLIENT_ID        Zoom OAuth app client ID
ZOOM_CLIENT_SECRET    Zoom OAuth app client secret
ZOOM_REDIRECT_URI     http://localhost:3000/api/zoom/callback (prod: your domain)
RESEND_API_KEY        Resend email API key
FROM_EMAIL            Verified sending email address
TWILIO_ACCOUNT_SID    Twilio Account SID (optional)
TWILIO_AUTH_TOKEN     Twilio Auth Token (optional)
TWILIO_PHONE_NUMBER   Twilio phone number (optional)
SERPAPI_KEY           SerpAPI key for Google Ads detection (optional)
NEXT_PUBLIC_APP_URL   http://localhost:3000 (prod: https://yourdomain.com)
CRON_SECRET           Any random string — used to secure the cron endpoint
```

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Set all env vars in Vercel dashboard. The `vercel.json` already configures:
- Cron job every 15 minutes for follow-up reminders
- 60s max duration for the scan function
- 30s max duration for the cron function

On Vercel, Playwright uses `@sparticuz/chromium` — this is already configured in `lib/scraper.ts` and `next.config.js`.

---

## Usage Flow

1. **Sign up** at `/login`
2. **Connect Zoom** at `/settings` → Zoom Integration
3. **Scan for leads** at `/scan` — pick state, city, industry → click Scan
4. Filter by "No website" + "No Google Ads" to see highest-value targets
5. Click **Script** to get a personalized call script
6. Call the business. If they say yes → click **Pipeline** to add them
7. In `/pipeline`, drag their card to **Called**, then **Booked**
8. Click the card → set meeting date/time → click **Book** → Zoom meeting created + follow-ups scheduled automatically
9. After the meeting → drag to **Showed** or **No Show**
10. If closed → drag to **Closed** + enter deal value

---

## File Structure

```
/app
  /scan              Scanner dashboard — Google Maps lead search
  /pipeline          Kanban board + daily metrics
  /pipeline/[id]     Lead detail — notes, script, website prompt, zoom, activity
  /settings          Zoom, email, SMS, daily goal, script tone
  /login             Supabase auth
  /api
    /scan            Playwright scraper + scoring engine
    /call-script     Claude call script generator  
    /website-prompt  Claude website build prompt generator
    /pipeline        CRUD for pipeline leads
    /pipeline/[id]   Individual lead fetch
    /zoom/auth       Zoom OAuth redirect
    /zoom/callback   Zoom token exchange
    /zoom/book       Create meeting + schedule follow-ups
    /cron/reminders  Follow-up sender (runs every 15 min via Vercel cron)
    /export          CSV download
    /settings        User settings CRUD
    /stats           Daily stats fetch
    /auth/callback   Supabase OAuth callback
    /health          Health check

/lib
  /scraper.ts        Playwright Google Maps scraper
  /scorer.ts         Lead scoring algorithm
  /websiteCheck.ts   Website HEAD checker + Google Ads detector
  /claude.ts         Call script + website prompt + follow-up email generators
  /zoom.ts           Zoom OAuth + meeting creation
  /followups.ts      Email + SMS follow-up sender
  /supabase.ts       Supabase client (server + client)

/data
  /industries.ts     50 industries + all US states/cities

/prisma
  /schema.prisma     Full DB schema (7 models)
  /rls.sql           Supabase Row Level Security policies
```

---

## Notes

- **Scraper ethics**: This scrapes publicly visible Google Maps data. Use responsibly and respect rate limits. For production scale, consider Google Places API instead.
- **Playwright on Vercel**: Works via `@sparticuz/chromium`. May hit 60s timeout on slow scans — consider chunking or running scraper as a background job for >50 results.
- **Follow-up emails**: Requires a verified domain in Resend. Test with your own email first.
- **Free tier**: Supabase free tier is sufficient for getting started.
