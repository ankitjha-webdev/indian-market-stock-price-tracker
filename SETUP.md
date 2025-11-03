# Quick Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory (copy from `env.example.txt`):

```env
DATABASE_URL="postgresql://user:password@localhost:5432/stock_tracker?schema=public"
NSE_API_URL="https://www.nseindia.com/api"
CRON_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Create and run migrations
npx prisma migrate dev --name init

# (Optional) Seed with sample data using Prisma Studio
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 5. Test the Application

1. **Dashboard**: Go to `/dashboard` - You'll see an empty list initially
2. **Add Sample Stocks**: You can manually add stocks via API or use mock data in development
3. **Undervalued Page**: Go to `/undervalued` to see undervalued stock calculations

### 6. Add Sample Stock Data (Optional)

You can add stocks manually by calling the API:

```bash
# Using curl
curl -X POST http://localhost:3000/api/stocks/fetch \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["RELIANCE", "TCS", "INFY"]}'

# Or use the update endpoint (which will fetch popular stocks)
curl -X GET http://localhost:3000/api/stocks/update
```

## File Connection Overview

### **Core Configuration**
- `package.json` → Defines all dependencies and scripts
- `tsconfig.json` → TypeScript configuration
- `next.config.js` → Next.js configuration
- `tailwind.config.ts` → Tailwind CSS + ShadCN UI theme
- `prisma/schema.prisma` → Database schema (User, Stock, TrackedStock models)

### **Database Layer**
- `lib/prisma.ts` → Prisma Client singleton (used by all API routes)
- `lib/stockService.ts` → Functions to fetch stock data from NSE API and update database
- `lib/getUndervaluedStocks.ts` → Algorithm to calculate undervalued stocks

### **API Routes** (Server-side)
- `app/api/stocks/route.ts` → GET all stocks with filters
- `app/api/stocks/fetch/route.ts` → Fetch stock data from NSE API
- `app/api/stocks/update/route.ts` → Cron endpoint for daily updates
- `app/api/stocks/undervalued/route.ts` → Get undervalued stocks list
- `app/api/stocks/[id]/track/route.ts` → Toggle stock tracking

### **Frontend Pages** (Client-side)
- `app/layout.tsx` → Root layout with Navbar and ThemeToggle
- `app/page.tsx` → Redirects to dashboard
- `app/dashboard/page.tsx` → Main dashboard showing all stocks
- `app/undervalued/page.tsx` → Undervalued stocks page with top 3 candidates
- `app/settings/page.tsx` → Settings/info page

### **UI Components**
- `components/Navbar.tsx` → Navigation bar (Dashboard, Undervalued, Settings)
- `components/StockCard.tsx` → Reusable card component for displaying stock info
- `components/ThemeToggle.tsx` → Dark/light mode toggle
- `components/ui/*` → ShadCN UI base components (Button, Card, Badge)

### **Cron Jobs**
- `lib/cron.ts` → Cron job setup (runs daily at 9 AM IST)
- `scripts/update-stocks.ts` → Standalone script for manual updates
- `app/api/cron/route.ts` → API endpoint to initialize cron jobs

## Data Flow

1. **Stock Data Fetching**:
   ```
   NSE API → stockService.fetchStockData() → updateStockInDB() → Prisma → PostgreSQL
   ```

2. **Undervalued Calculation**:
   ```
   getUndervaluedStocks() → Reads all stocks → Calculates scores → Updates isUndervalued flag
   ```

3. **Frontend Display**:
   ```
   Dashboard/Undervalued Pages → API Routes (/api/stocks/*) → Prisma → PostgreSQL → Response → UI
   ```

4. **Daily Updates**:
   ```
   Cron Job (9 AM IST) → /api/stocks/update → fetchAndUpdateStocks() → getUndervaluedStocks()
   ```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DATABASE_URL` format: `postgresql://user:password@host:port/database?schema=public`
- Run `npx prisma db push` if migrations fail

### API Errors
- Check NSE API URL is correct
- In development, mock data will be used if API fails
- Check browser console and server logs

### Build Errors
- Run `npx prisma generate` if Prisma errors occur
- Clear `.next` folder: `rm -rf .next` then rebuild

## Production Deployment

1. Set up PostgreSQL database (Supabase, Railway, Neon, etc.)
2. Update environment variables in deployment platform
3. Run `npx prisma migrate deploy` to apply migrations
4. Set up cron job (Vercel Cron, GitHub Actions, or external service)
5. Deploy to Vercel, Railway, or your preferred platform

