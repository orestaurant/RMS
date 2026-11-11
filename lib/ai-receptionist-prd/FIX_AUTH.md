# Fix Authentication "Invalid Origin" Error

If you're seeing "Invalid origin: https://vm-xxxxx.vusercontent.net" when trying to sign up, follow these steps:

## Quick Fix (1 minute)

1. Copy your current v0 preview URL from the browser address bar (e.g., `https://vm-lqqd2i52tb8.vusercontent.net`)

2. Go to **Settings** (top right of v0 UI) → **Vars** (or **Settings** → **Environment Variables**)

3. Set this environment variable:
   ```
   BETTER_AUTH_URL=https://vm-lqqd2i52tb8.vusercontent.net
   ```
   (Replace with YOUR actual v0 preview domain)

4. The dev server should auto-reload. Try signing up again.

## What's Happening?

Better Auth requires authentication requests to come from a trusted origin. When running in v0 preview, the app is served from a vusercontent.net domain, which needs to be explicitly trusted.

## For Production Deployment

When you deploy to Vercel or another host:

1. Go to your hosting dashboard (Vercel, etc.)
2. Set these environment variables:
   ```
   BETTER_AUTH_URL=https://yourdomain.com
   DATABASE_URL=your-neon-postgres-url
   BETTER_AUTH_SECRET=your-secret-here
   ```

3. Deploy and test at your production URL

## Still Having Issues?

Make sure:
- ✅ `BETTER_AUTH_SECRET` is set (get from Settings → Vars)
- ✅ `DATABASE_URL` is set and points to Neon
- ✅ `BETTER_AUTH_URL` matches your current domain exactly
- ✅ Dev server has restarted after environment changes

If still stuck, check the console for specific error messages and refer to AUTH_SETUP.md for more troubleshooting.
