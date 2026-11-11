# Quick Reference Guide

## Authentication Issue? 🔐

**Problem:** "Invalid origin: https://vm-xxxxx.vusercontent.net"

**Solution:**
1. Copy your v0 preview URL (browser address bar)
2. Settings → Vars → Set `BETTER_AUTH_URL` to that URL
3. Restart dev server
4. Try signing up again

**Example:**
```
BETTER_AUTH_URL=https://vm-lqqd2i52tb8.vusercontent.net
```

---

## First-Time Setup Checklist ✅

- [ ] Run `pnpm dev` to start server
- [ ] Set `BETTER_AUTH_URL` in environment variables
- [ ] Create account at `/sign-up`
- [ ] Complete 4-step onboarding
- [ ] Access dashboard at `/dashboard`
- [ ] Create first AI receptionist
- [ ] Test chat interface

---

## Main Features 📋

| Feature | Route | What It Does |
|---------|-------|-------------|
| **Dashboard** | `/dashboard` | Overview of your company |
| **Receptionists** | `/dashboard/company/[id]` | Create & manage AI receptionists |
| **Calls** | `/dashboard/company/[id]/calls` | View call history & metrics |
| **CRM** | `/dashboard/company/[id]/contacts` | Manage contacts & deals |
| **Appointments** | `/dashboard/company/[id]/appointments` | Schedule meetings |
| **Messages** | `/dashboard/company/[id]/messages` | Send SMS/Email |
| **Analytics** | `/dashboard/company/[id]/analytics` | Performance metrics |
| **Billing** | `/dashboard/company/[id]/billing` | Manage subscriptions |
| **Integrations** | `/dashboard/company/[id]/integrations` | Connect external services |
| **Settings** | `/dashboard/company/[id]/settings` | Company configuration |

---

## File Structure 📁

```
app/
├── page.tsx                    # Homepage
├── sign-in/                    # Login page
├── sign-up/                    # Signup page
├── dashboard/                  # Main dashboard
├── api/auth/[...all]/         # Auth API endpoint
└── actions/                    # Server actions for database

components/
├── auth-form.tsx              # Login/signup form
├── dashboard/                 # Dashboard components
└── ui/                        # shadcn/ui components

lib/
├── auth.ts                    # Better Auth config
├── auth-client.ts             # Auth client
├── db/                        # Database setup
│   ├── index.ts              # Drizzle client
│   └── schema.ts             # Database schema
└── utils/                     # Helper functions

public/                        # Static assets
```

---

## Common Tasks 🛠️

### Create an AI Receptionist
1. Go to Dashboard
2. Find "AI Receptionists" section
3. Click "New Receptionist"
4. Fill in: Name, Voice ID, System Prompt
5. Click Save
6. Test with chat widget

### Add a Contact
1. Go to CRM
2. Click "Add Contact"
3. Fill: Name, Email, Phone, Company
4. Click Save

### Schedule an Appointment
1. Go to Appointments
2. Click "New Appointment"
3. Select contact
4. Set date/time
5. Add description
6. Click Save

### View Analytics
1. Go to Analytics
2. Select date range
3. View metrics:
   - Total calls
   - Success rate
   - Average sentiment
   - Appointment conversion

---

## Environment Variables Reference 🔑

```bash
# Database (required)
DATABASE_URL=postgresql://user:pass@host/db

# Authentication (required)
BETTER_AUTH_SECRET=32-char-random-string
BETTER_AUTH_URL=http://localhost:3000  # Change for v0!

# AI (optional)
AI_GATEWAY_API_KEY=your-key-here

# Payments (optional)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Voice (optional)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## Deployment Checklist 🚀

Before going live:

- [ ] All environment variables set
- [ ] `BETTER_AUTH_URL` points to production domain
- [ ] Database backups enabled
- [ ] SSL certificate installed
- [ ] Email notifications configured
- [ ] Analytics tracking enabled
- [ ] Stripe in production mode
- [ ] Error logging configured
- [ ] Performance optimized
- [ ] Security headers set

See [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) for full list.

---

## Need Help? 🆘

- 📖 [README.md](README.md) - Full project overview
- 🔧 [SETUP_GUIDE.md](SETUP_GUIDE.md) - Complete setup instructions
- 🐛 [FIX_AUTH.md](FIX_AUTH.md) - Authentication troubleshooting
- 🚀 [DEPLOYMENT.md](DEPLOYMENT.md) - How to deploy
- 📋 [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) - Pre-launch verification
- 🏗️ [PLATFORM_OVERVIEW.md](PLATFORM_OVERVIEW.md) - Architecture details

---

**Last Updated:** June 26, 2026
