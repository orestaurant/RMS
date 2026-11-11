# AI Receptionist SaaS Platform - Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- Node.js 18+ installed
- PostgreSQL database (Neon recommended)
- Stripe account for payments
- Vercel account for hosting

## Environment Variables Setup

### Required Variables

1. **Database Connection**
   ```bash
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   ```

2. **Authentication Secret** (CRITICAL)
   Generate a secure 32+ character string:
   ```bash
   openssl rand -base64 32
   ```
   Then set:
   ```bash
   BETTER_AUTH_SECRET=your_generated_secret_here
   ```

3. **Optional: Custom Domain**
   ```bash
   BETTER_AUTH_URL=https://yourdomain.com
   ```

## Local Development Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set environment variables**
   Copy `.env.example` to `.env.local` and fill in values:
   ```bash
   cp .env.example .env.local
   ```

3. **Start dev server**
   ```bash
   pnpm dev
   ```

4. **Access the app**
   - Open http://localhost:3000
   - Create an account to start

## Database Setup

The database schema is automatically created on first run via Neon MCP tools.

To manually create tables, use the SQL files in `/scripts/migrations/` (if available).

## Production Deployment

### Deploy to Vercel

1. **Connect your GitHub repo**
   ```bash
   vercel
   ```

2. **Set environment variables in Vercel dashboard**
   - Go to Project Settings → Environment Variables
   - Add all required variables from `.env.example`

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Deploy to Custom Server

1. **Build the project**
   ```bash
   pnpm build
   ```

2. **Set environment variables**
   Create `.env.production` with production values

3. **Start the server**
   ```bash
   NODE_ENV=production pnpm start
   ```

## Database Migrations

If modifying the schema:

1. **Using Neon MCP** (recommended)
   - Use the Neon tools in the Vercel v0 interface
   - Run one SQL statement at a time

2. **Manual SQL**
   - Connect directly to your PostgreSQL database
   - Run schema migrations from `/lib/db/schema.ts`

## Troubleshooting

### Login Issues

**Problem: "Invalid origin" error**
- Ensure `BETTER_AUTH_SECRET` is set
- Check `BETTER_AUTH_URL` matches your domain
- For local dev, localhost:3000 should be in trusted origins

**Solution:**
```bash
# Generate new secret
openssl rand -base64 32

# Update .env.local
BETTER_AUTH_SECRET=new_secret_here

# Restart dev server
pnpm dev
```

### Database Connection Issues

**Problem: Cannot connect to database**
- Verify `DATABASE_URL` format is correct
- Check network access (firewall rules)
- Ensure database user has proper permissions

**Solution:**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Build Errors

**Problem: Build fails with memory issues**
- Increase Node memory:
```bash
NODE_OPTIONS=--max-old-space-size=4096 pnpm build
```

### Stripe Integration

To enable payments:
1. Create a Stripe account at https://stripe.com
2. Get your publishable and secret keys
3. Add to environment variables:
   ```bash
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
   STRIPE_SECRET_KEY=sk_...
   ```

## Security Checklist

- [ ] `BETTER_AUTH_SECRET` is strong and unique
- [ ] Environment variables are not committed to git
- [ ] Database backups are configured
- [ ] HTTPS is enabled in production
- [ ] Security headers are set (handled by Next.js by default)
- [ ] Rate limiting is configured for APIs
- [ ] Database connection is encrypted (SSL/TLS)

## Monitoring

### Health Checks

Monitor these endpoints:
- `GET /api/auth/session` - Authentication status
- `GET /api/receptionist/chat` - AI service status

### Logging

Logs are stored in:
- Development: Console output from `pnpm dev`
- Production: Vercel logs dashboard

## Support

For issues:
1. Check this deployment guide
2. Review the README.md
3. Check application logs
4. Contact Vercel support for hosting issues
5. Contact Better Auth support for authentication issues
