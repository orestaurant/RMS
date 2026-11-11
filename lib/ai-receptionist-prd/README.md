# CallAI - AI Receptionist SaaS Platform

A comprehensive AI-powered receptionist platform that automates phone calls, manages appointments, qualifies leads, and streamlines business communications.

## Features

### Core Modules
- **AI Receptionist**: Intelligent voice AI that answers calls 24/7
- **Call Management**: Track, route, and analyze all incoming calls
- **CRM**: Comprehensive contact and deal management
- **Appointments**: Scheduling with calendar integration
- **Messaging**: Multi-channel communication (SMS, Email, Voice, WhatsApp)
- **Analytics**: Real-time dashboards and reporting
- **Billing**: Stripe integration with subscription management
- **Integrations**: Connect with 6+ popular services

### Technical Highlights
- Multi-tenant architecture with row-level security
- Real-time AI conversations with streaming responses
- Type-safe database operations with Drizzle ORM
- Secure authentication with Better Auth
- Production-ready error handling and logging

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Server Actions + API Routes
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Authentication**: Better Auth (email/password)
- **AI**: Vercel AI SDK 6 (OpenAI/Anthropic/Google)
- **Payments**: Stripe
- **Storage**: Vercel Blob

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)
- Neon PostgreSQL account
- Vercel account (optional, for deployment)

### Installation

1. **Clone and install dependencies:**
```bash
pnpm install
```

2. **Set up environment variables:**
```bash
# Copy the example
cp .env.example .env.local

# Add your values
BETTER_AUTH_SECRET=your_secret_here  # Generate with: openssl rand -base64 32
DATABASE_URL=postgresql://...
BETTER_AUTH_URL=http://localhost:3000  # Change in production
```

3. **Set up the database:**
```bash
# Run migrations
pnpm drizzle-kit push
```

4. **Start the development server:**
```bash
pnpm dev
```

Visit http://localhost:3000 to access the app.

## Database Schema

### Core Tables
- **user** - User accounts (Better Auth)
- **session** - Active sessions (Better Auth)
- **account** - OAuth providers (Better Auth)
- **verification** - Email verification (Better Auth)
- **company** - Organization/workspace
- **receptionist** - AI receptionist configuration
- **contact** - CRM contacts and leads
- **call_record** - Call history and logs
- **appointment** - Scheduled appointments
- **message** - SMS/Email/Voice communications
- **deal** - Sales pipeline management
- **task** - Team task management
- **analytics** - Daily metrics and KPIs
- **subscription** - Billing and plans

## Project Structure

```
app/
├── dashboard/          # Protected dashboard routes
├── api/               # API endpoints
├── actions/           # Server actions
└── (auth)             # Auth routes

components/
├── dashboard/         # Dashboard components
├── ui/               # shadcn/ui components
└── auth-form.tsx     # Auth forms

lib/
├── auth.ts           # Better Auth config
├── auth-client.ts    # Client-side auth
├── db/
│   ├── index.ts      # Drizzle client
│   └── schema.ts     # Database schema
└── utils/
    └── errors.ts     # Error handling
```

## Server Actions

All data mutations happen through type-safe server actions:

```typescript
// app/actions/company.ts
export async function createCompany(name: string, industry?: string) {
  const userId = await getUserId()
  // ... validation and database operations
}
```

Key patterns:
- `getUserId()` - Verify authentication
- `verifyCompanyAccess()` - Check authorization
- `revalidatePath()` - Update UI after mutations

## Authentication

The app uses Better Auth with email/password:

- Sign up at `/sign-up`
- Sign in at `/sign-in`
- Protected routes redirect to `/sign-in`
- Cookies are secure HTTP-only (HTTPS in production)

## API Routes

### Chat/AI Endpoints
- `POST /api/receptionist/chat` - Receptionist conversation

Response format:
```json
{
  "type": "text-delta",
  "delta": "response text",
  "timestamp": "2026-06-26T..."
}
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

```bash
vercel deploy
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build
CMD ["pnpm", "start"]
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection |
| `BETTER_AUTH_SECRET` | Yes | 32+ char random string |
| `BETTER_AUTH_URL` | No | Auth callback URL |
| `STRIPE_SECRET_KEY` | No | Stripe API key |
| `STRIPE_PUBLISHABLE_KEY` | No | Stripe public key |

## Performance Optimization

- **ISR**: Static generation for public pages
- **Streaming**: Real-time AI responses
- **Caching**: Cache API responses with `revalidateTag`
- **Database**: Indexed queries with optimized schemas

## Security

- **CSRF Protection**: Built into Next.js
- **SQL Injection**: Prevented with parameterized queries
- **XSS**: Escaped in React components
- **CORS**: Configured per environment
- **Rate Limiting**: Can be added with Upstash

## Development

### Run Tests
```bash
pnpm test
```

### Lint Code
```bash
pnpm lint
```

### Format Code
```bash
pnpm format
```

### Database
```bash
pnpm drizzle-kit studio  # Open DB studio
```

## Troubleshooting

### Build Fails
- Clear `.next` directory
- Ensure all env vars are set
- Check Node.js version compatibility

### Auth Issues
- Verify `BETTER_AUTH_SECRET` is set
- Check cookies are enabled
- Ensure `BETTER_AUTH_URL` matches deployment domain

### Database Errors
- Verify `DATABASE_URL` is correct
- Run migrations: `pnpm drizzle-kit push`
- Check network access to database

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT

## Support

For issues, questions, or feedback:
- Email: support@callai.dev
- Documentation: docs.callai.dev
- GitHub Issues: github.com/callai/platform/issues
