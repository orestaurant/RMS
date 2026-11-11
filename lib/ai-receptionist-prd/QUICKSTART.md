# Quick Start Guide

Get the AI Receptionist SaaS Platform running in 5 minutes.

## 1. Prerequisites (1 min)

- Node.js 18+ installed
- PostgreSQL database (use Neon for free)
- Git installed

## 2. Setup (2 min)

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-receptionist-platform

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local
```

## 3. Configure Environment (1 min)

Edit `.env.local`:

```bash
# Get from Neon Dashboard
DATABASE_URL=postgresql://user:password@host/database

# Generate a new secret (required!)
# Run: openssl rand -base64 32
BETTER_AUTH_SECRET=your_secret_here

# Keep these as-is for local development
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 4. Start Development Server (1 min)

```bash
pnpm dev
```

The app will be available at **http://localhost:3000**

## 5. Create Your First Account (1 min)

1. Go to http://localhost:3000
2. Click "Sign Up"
3. Enter email and password
4. Complete the 4-step onboarding
5. You're in! 🎉

## What's Next?

### Explore the AI Receptionist
1. Go to Dashboard → Your Company
2. Click "New Receptionist"
3. Configure name, greeting, and transfer number
4. Click "Test Chat" to talk to your AI receptionist

### Create a Contact
1. Go to CRM section
2. Click "New Contact"
3. Add name, email, phone
4. Save

### Schedule an Appointment
1. Go to Appointments
2. Click "New Appointment"
3. Select a contact
4. Choose date and time
5. Save

### Check Analytics
1. Go to Analytics
2. View today's metrics
3. See call trends and sentiment

## Troubleshooting

### "Invalid origin" when logging in?
→ See [AUTH_SETUP.md](AUTH_SETUP.md) for detailed solutions

### Database connection failing?
→ Check `DATABASE_URL` format in `.env.local`

### Build errors?
→ Run `pnpm install` again, then `pnpm dev`

## Going to Production

When ready to deploy:

1. Read [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions
2. Deploy to Vercel with one click
3. Set production environment variables
4. Follow [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)

## File Structure

```
ai-receptionist-platform/
├── app/               # Pages and API routes
├── components/        # React components
├── lib/               # Utilities and database
├── public/            # Static files
├── .env.example       # Environment template
├── README.md          # Full documentation
├── DEPLOYMENT.md      # Deployment guide
├── AUTH_SETUP.md      # Auth troubleshooting
├── QUICKSTART.md      # This file!
└── package.json       # Dependencies
```

## Key Commands

```bash
# Start development
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint

# Type check
pnpm type-check
```

## Features at a Glance

- ✅ AI-powered phone receptionist
- ✅ Call management and history
- ✅ CRM with contacts and deals
- ✅ Appointment scheduling
- ✅ Multi-channel messaging
- ✅ Real-time analytics
- ✅ Stripe billing
- ✅ Team management
- ✅ Third-party integrations
- ✅ Admin dashboard

## Support

- 📖 See [README.md](README.md) for detailed docs
- 🔐 See [AUTH_SETUP.md](AUTH_SETUP.md) for auth issues
- 🚀 See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment
- ✅ See [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) for production
- 📋 See [PLATFORM_OVERVIEW.md](PLATFORM_OVERVIEW.md) for architecture

## Ready to deploy?

```bash
# Login to Vercel
vercel login

# Deploy
vercel --prod
```

That's it! You now have a fully functional AI Receptionist SaaS platform running.

Happy building! 🚀
