# 🏥 Kesling Cirebon

Aplikasi Laporan Kesehatan Lingkungan Kota Cirebon — mengelola data bulanan TPP, SPAL, SAB, Rumah, Jamban, dan TTU dari 21 Puskesmas.

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis (ioredis)
- **UI**: Shadcn/UI + Tailwind CSS + Recharts
- **State**: TanStack React Query + Zustand + nuqs
- **Auth**: NextAuth.js (credentials)
- **Testing**: Vitest + React Testing Library
- **Monorepo**: Turborepo + pnpm

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- Redis 7+

## Setup Development

```bash
# Clone & install
git clone <repo-url>
cd apps-kes
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Setup database
pnpm db:migrate
pnpm db:seed

# Run development
pnpm dev
```

Buka http://localhost:3000. Login default: `admin@dinkes.go.id` / `admin123`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Random secret for JWT |
| `NEXTAUTH_URL` | ✅ | App URL (http://localhost:3000) |
| `REDIS_URL` | ❌ | Redis URL (default: redis://localhost:6379) |
| `SMTP_HOST` | ❌ | Email SMTP host |
| `SMTP_PORT` | ❌ | Email SMTP port |
| `SMTP_USER` | ❌ | Email SMTP user |
| `SMTP_PASS` | ❌ | Email SMTP password |
| `SENTRY_DSN` | ❌ | Sentry error tracking DSN |
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ | Sentry client DSN |

## Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run Biome linter
pnpm test         # Run tests (Vitest)
pnpm db:migrate   # Run Prisma migrations
pnpm db:seed      # Seed database
pnpm db:studio    # Open Prisma Studio
```

## Deploy (Docker)

```bash
docker-compose up -d
```

Atau deploy via Coolify:
1. Connect repo ke Coolify
2. Set environment variables
3. Build command: `pnpm build`
4. Start command: `pnpm start`
5. Health check: `/api/health`

## Project Structure

```
apps-kes/
├── apps/web/              # Next.js application
│   ├── src/
│   │   ├── app/           # Pages & API routes
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilities & configs
│   │   ├── stores/        # Zustand stores
│   │   └── test/          # Test files
│   └── public/            # Static assets
├── packages/database/     # Prisma schema & client
└── docker-compose.yml
```

## Roles

| Role | Akses |
|------|-------|
| **ADMIN** | Semua fitur: master data, laporan, users, backup, import, target |
| **OPERATOR** | Input laporan (hanya puskesmas sendiri), lihat dashboard & rekap |

## Features

- 📊 Dashboard dengan grafik tren bulanan (Recharts)
- 📋 6 jenis laporan (TPP, SPAL, SAB, Rumah, Jamban, TTU)
- 📥 Import/Export Excel (SheetJS)
- 📄 Export PDF (jsPDF)
- 🏆 Perbandingan & ranking antar Puskesmas
- 🎯 Target & capaian dengan progress bars
- 📝 Audit log & changelog per record
- 🔔 Notifikasi deadline
- 📱 PWA (installable, offline fallback)
- 🌙 Dark mode
- ⌨️ Command palette (Ctrl+K)
- 🔒 Role-based access control
- ⚡ Redis caching & rate limiting

## License

Private — Dinas Kesehatan Kota Cirebon
