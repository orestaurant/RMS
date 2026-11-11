# Authentication Setup Guide

## Quick Start - Login Issues Resolution

If you're getting "Invalid origin" errors when trying to login, follow these steps:

### Step 1: Verify BETTER_AUTH_SECRET

This is the most common cause of login failures.

```bash
# Check if the secret is set
echo $BETTER_AUTH_SECRET

# If empty, generate a new one
openssl rand -base64 32

# Add to your .env.local file
BETTER_AUTH_SECRET=your_32_character_secret_here
```

### Step 2: Understand the Architecture

The platform uses **Better Auth** for authentication with these key components:

- **Server Config** (`lib/auth.ts`): Handles auth on the backend
- **Client Config** (`lib/auth-client.ts`): Handles auth on the frontend
- **Middleware**: Protects routes and sessions
- **Database**: Stores users, sessions, and accounts

### Step 3: Environment Configuration

Required environment variables:

```bash
# Database - must be a valid PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication secret - random 32+ character string
BETTER_AUTH_SECRET=your_secret_here

# Optional - custom domain (leave unset for auto-detection)
# BETTER_AUTH_URL=https://yourdomain.com
```

### Step 4: Trusted Origins Configuration

The application automatically adds these origins as trusted:

**Development:**
- `http://localhost:3000`
- `http://localhost:3001`
- `$V0_RUNTIME_URL` (v0.app preview)
- `$VERCEL_URL` (Vercel deployment)
- `$VERCEL_PROJECT_PRODUCTION_URL` (Production domain)

**In Production:**
Add any additional domains to `lib/auth.ts`:

```typescript
trustedOrigins: [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  // ... other origins
]
```

### Step 5: Restart and Test

After making changes:

```bash
# Kill the dev server
pkill -f "next dev"

# Clear cache
rm -rf .next

# Start fresh
pnpm dev

# Navigate to http://localhost:3000
# Try signing up with: test@example.com / password123
```

## Common Issues and Solutions

### Issue 1: "Invalid origin"

**Cause:** Domain mismatch between request origin and `trustedOrigins`

**Fix:**
```bash
# 1. Check your current URL
# If localhost: should work by default
# If v0 preview: V0_RUNTIME_URL should auto-populate

# 2. Verify BETTER_AUTH_SECRET is set
echo $BETTER_AUTH_SECRET

# 3. If using custom domain, set BETTER_AUTH_URL
export BETTER_AUTH_URL=https://yourdomain.com

# 4. Restart dev server
pnpm dev
```

### Issue 2: "Cookie not set / Session not persisting"

**Cause:** SameSite cookie policy in development mode

**Fix:** The app automatically sets `SameSite=none; Secure` in development. If still having issues:

```bash
# Ensure NODE_ENV is correct
echo $NODE_ENV  # Should be 'development' or 'production'

# Check cookie attributes in browser DevTools:
# Application → Cookies → localhost:3000
# Look for auth_token or session cookie
```

### Issue 3: "Database connection failed"

**Cause:** Invalid DATABASE_URL or network access issue

**Fix:**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# If using Neon, check connection string format:
# postgresql://user:password@host/database?sslmode=require

# Ensure firewall allows connections from your IP
```

### Issue 4: "404 on /api/auth/*"

**Cause:** Auth handler not mounted

**Fix:** Check `app/api/auth/[...all]/route.ts` exists and contains:

```typescript
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth.handler)
```

## Testing Authentication Flow

### Test Sign Up

```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "name": "Test User"
  }'
```

### Test Sign In

```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!"
  }'
```

### Test Session

```bash
curl http://localhost:3000/api/auth/session \
  -H "Cookie: auth_token=your_session_token"
```

## Production Deployment

### Vercel Setup

1. **Go to Vercel Dashboard**
2. **Project Settings → Environment Variables**
3. **Add these variables:**

```
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=your_secret
BETTER_AUTH_URL=https://yourdomain.vercel.app
```

4. **Deploy:**
```bash
vercel --prod
```

### Custom Domain

1. **Add domain to Vercel**
2. **Update BETTER_AUTH_URL:**
```bash
export BETTER_AUTH_URL=https://yourdomain.com
vercel env pull production
vercel --prod
```

3. **DNS configuration:**
```
CNAME yourdomain.com → cname.vercel.sh
```

## Security Best Practices

- [ ] `BETTER_AUTH_SECRET` is unique per environment
- [ ] Never commit `.env.local` to git
- [ ] Use HTTPS only in production
- [ ] Rotate `BETTER_AUTH_SECRET` periodically
- [ ] Keep dependencies updated: `pnpm update`
- [ ] Enable 2FA in production
- [ ] Set secure cookie flags

## Getting Help

1. Check console logs:
   ```bash
   # Check Next.js logs
   tail -f .next/dev/logs/next-development.log
   ```

2. Enable debug mode:
   ```bash
   DEBUG=better-auth:* pnpm dev
   ```

3. Check Browser DevTools:
   - Console tab for errors
   - Network tab for failed requests
   - Application → Cookies for session cookies

4. Verify auth handler is working:
   - Visit http://localhost:3000/api/auth/callback/credentials
   - Should show auth configuration
