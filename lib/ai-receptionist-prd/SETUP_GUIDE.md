# CallAI Receptionist Platform - Complete Setup Guide

## Getting Started (5 minutes)

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon recommended - already set up)
- Better Auth secret (already set up)

### Step 1: Start the Dev Server

```bash
cd /vercel/share/v0-project
pnpm dev
```

The server will start on `http://localhost:3000`

### Step 2: Fix Authentication for v0 Preview

When running in v0 preview, you'll see: `Invalid origin: https://vm-xxxxx.vusercontent.net`

**Solution (2 steps):**

1. Copy your v0 preview URL from the browser (e.g., `https://vm-lqqd2i52tb8.vusercontent.net`)

2. In v0 UI → Settings → Vars, set:
   ```
   BETTER_AUTH_URL=https://vm-lqqd2i52tb8.vusercontent.net
   ```
   (Use YOUR actual v0 domain)

3. Wait for dev server to restart (you'll see a message in console)

### Step 3: Create Your Account

1. Go to `http://localhost:3000/sign-up` (or click "Sign Up" on homepage)
2. Enter:
   - Name: Your name
   - Email: Any email (e.g., test@example.com)
   - Password: At least 8 characters
3. Click "Sign Up"

### Step 4: Complete Onboarding

After signing up, you'll be redirected to the 4-step onboarding:
1. **Company Info** - Enter your company name and industry
2. **AI Receptionist** - Create your first AI receptionist with custom settings
3. **Review** - Confirm your setup
4. **Complete** - Start using the platform

### Step 5: Access Your Dashboard

After onboarding, you'll be at `/dashboard` with access to:
- **AI Receptionists** - Create and manage virtual receptionists
- **Calls** - View call history and metrics
- **Contacts** - CRM with contact management
- **Appointments** - Schedule and manage appointments
- **Messages** - Send SMS and emails
- **Analytics** - View performance metrics
- **Billing** - Manage subscription and payments
- **Integrations** - Connect external services
- **Settings** - Company and account settings

## Troubleshooting

### "Invalid origin" error during signup
→ See [FIX_AUTH.md](FIX_AUTH.md)

### "Database connection error"
→ Check that `DATABASE_URL` environment variable is set in Settings → Vars

### "Cannot find module" errors
→ Run `pnpm install` and restart dev server

### Buttons not responding or infinite loading
→ Check browser console for errors (F12 → Console tab)
→ Restart dev server: `pnpm dev`

## Environment Variables

Required:
- `DATABASE_URL` - Neon PostgreSQL connection string (auto-set)
- `BETTER_AUTH_SECRET` - Random 32+ char string (auto-set)
- `BETTER_AUTH_URL` - Your current domain (set based on where running)

Optional:
- `STRIPE_SECRET_KEY` - For payment testing
- `AI_GATEWAY_API_KEY` - For AI features beyond free tier
- `TWILIO_ACCOUNT_SID` - For phone integration

## Architecture

### Frontend
- Next.js 16 with App Router
- React 19 with Suspense and Streaming
- shadcn/ui components
- Tailwind CSS styling

### Backend  
- Server actions for type-safe API calls
- Better Auth for authentication
- Drizzle ORM for database queries
- Neon PostgreSQL for data storage

### Real-time Features
- Vercel AI SDK 6 for streaming conversations
- WebSocket support for live updates
- Server-sent events for notifications

## Next Steps

1. **Customize Your Receptionist**
   - Go to Dashboard → AI Receptionists
   - Click an receptionist and edit settings
   - Test using the chat interface

2. **Add Integrations**
   - Go to Dashboard → Integrations
   - Connect Stripe for payments
   - Connect Twilio for phone calls
   - Connect Google Calendar for scheduling

3. **Manage Contacts**
   - Go to Dashboard → CRM
   - Add contacts manually
   - Import from CSV or external systems

4. **View Metrics**
   - Go to Dashboard → Analytics
   - Monitor call volumes and success rates
   - Track appointment conversions

5. **Deploy to Production**
   - See [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel, Docker, or self-hosted options

## Support

- 📖 Read [README.md](README.md) for full project overview
- 🐛 See [AUTH_SETUP.md](AUTH_SETUP.md) for auth troubleshooting
- 📋 Check [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) before going live
- 🚀 See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment options

## Quick Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production server
NODE_ENV=production pnpm start

# Run type checking
pnpm type-check

# Format code
pnpm format
```

---

**Last updated:** June 26, 2026
**v0 Platform:** AI Receptionist SaaS Suite
