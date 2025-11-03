# Indian Market Stock Price Tracker

A production-ready Next.js 14 application to track and discover undervalued Indian stocks (NSE/BSE).

## 🚀 Features

- **Dashboard**: View all tracked stocks with real-time prices, P/E ratios, and market data
- **Undervalued Stocks**: Automatically identifies and ranks undervalued stocks based on multiple factors
- **Stock Tracking**: Track/untrack stocks of interest
- **Daily Updates**: Automated cron job updates stock prices daily at 9:00 AM IST
- **Dark Mode**: Built-in theme toggle
- **Responsive UI**: Modern design with ShadCN UI components

## 🛠️ Tech Stack

- **Next.js 14** (App Router, TypeScript, Server Actions)
- **Tailwind CSS** + **ShadCN UI** for design system
- **Prisma ORM** with PostgreSQL
- **stock-nse-india** for live NSE stock data
- **node-cron** for scheduled tasks
- **Chart.js** for stock trend visualization (ready for implementation)
- **Zustand** for global state management (ready for implementation)

## 📦 Installation

1. **Clone the repository** and install dependencies:

```bash
npm install
```

2. **Setup environment variables**:

Create a `.env` file in the root directory (copy from `env.example.txt`):

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/stock_tracker?schema=public"

# Stock Data Source (uses dummy data by default - no API key needed!)
USE_REAL_API=false

# NSE/BSE API (only used when USE_REAL_API=true)
NSE_API_URL="https://www.nseindia.com/api"

# Cron Job Secret
CRON_SECRET="your-secret-key-here-change-in-production"

# Next Auth URL (for cron jobs)
NEXTAUTH_URL="http://localhost:3000"
```

> **Note**: The app uses **dummy stock data by default**, so you can run it immediately without any API setup! See "Stock Data" section below for switching to real API.

3. **Setup Database**:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database with dummy stock data (optional, but recommended)
# Visit http://localhost:3000/api/stocks/seed after starting the server

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

4. **Run the development server**:

```bash
npm run dev
```

5. **Seed initial stock data** (recommended):

After the server starts, visit: [http://localhost:3000/api/stocks/seed](http://localhost:3000/api/stocks/seed)

This will populate the database with 20 popular Indian stocks using dummy data.

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   └── stocks/
│   │       ├── fetch/route.ts      # Fetch single/multiple stocks
│   │       ├── update/route.ts     # Cron endpoint for daily updates
│   │       ├── undervalued/route.ts # Get undervalued stocks
│   │       └── [id]/track/route.ts # Track/untrack stocks
│   ├── dashboard/                  # Dashboard page
│   ├── undervalued/                # Undervalued stocks page
│   ├── settings/                   # Settings page
│   ├── layout.tsx                  # Root layout with navbar
│   └── globals.css                 # Global styles
├── components/
│   ├── ui/                         # ShadCN UI components
│   ├── StockCard.tsx               # Stock card component
│   └── Navbar.tsx                  # Navigation bar
├── lib/
│   ├── prisma.ts                   # Prisma client singleton
│   ├── stockService.ts             # Stock fetching & update logic
│   ├── getUndervaluedStocks.ts     # Undervalued calculation logic
│   └── utils.ts                    # Utility functions
├── prisma/
│   └── schema.prisma               # Database schema
└── scripts/
    └── update-stocks.ts            # Standalone stock update script
```

## 🔌 API Routes

### `GET /api/stocks`
Get all stocks with optional filters:
- `?tracked=true` - Only tracked stocks
- `?undervalued=true` - Only undervalued stocks

### `GET /api/stocks/fetch?symbol=RELIANCE`
Fetch data for a single stock (uses dummy data by default).

### `POST /api/stocks/fetch`
Fetch multiple stocks:
```json
{
  "symbols": ["RELIANCE", "TCS", "INFY"]
}
```

### `GET /api/stocks/seed` or `POST /api/stocks/seed`
Seed database with all available dummy stocks (20 popular Indian stocks). Perfect for initial setup!

### `GET /api/stocks/populate-all` or `POST /api/stocks/populate-all`
**Populate database with ALL NSE stocks** (requires `USE_REAL_API=true`)

Query parameters:
- `?limit=50` - Limit number of stocks to fetch (for testing)
- `?batchSize=10` - Stocks per batch (default: 10)
- `?delayBetweenBatches=1000` - Delay between batches in ms (default: 1000)
- `?delayBetweenRequests=200` - Delay between requests in ms (default: 200)

Example:
```
GET /api/stocks/populate-all?limit=50
```

⚠️ **Warning**: Fetching all NSE stocks can take a very long time (there are thousands of stocks). Use `limit` parameter for testing.

### `POST /api/stocks/update`
Cron endpoint to update all tracked stocks. Requires `Authorization: Bearer <CRON_SECRET>` header.

### `GET /api/stocks/undervalued`
Get undervalued stocks with optional params:
- `?limit=10` - Limit results
- `?minScore=30` - Minimum undervalued score

### `POST /api/stocks/[id]/track`
Toggle tracking for a stock:
```json
{
  "isTracked": true
}
```

## 📊 Undervalued Stock Algorithm

Stocks are marked as undervalued based on:
1. **P/E Ratio** (< 15 = undervalued)
2. **Price vs 52-week high** (>20% discount = undervalued)
3. **Price vs 52-week low** (healthy distance = good)
4. **Market cap** (small caps may be undervalued)

Each stock gets an "undervalued score" - higher = more undervalued.

## ⏰ Cron Job Setup

### Option 1: Vercel Cron (Production - Recommended)
The project is configured with **Vercel Cron** for automatic daily stock updates.

**Configuration:**
- File: `vercel.json` - Contains cron schedule
- Schedule: `30 3 * * *` (3:30 AM UTC = 9:00 AM IST)
- Endpoint: `/api/stocks/update`

**How it works:**
1. Deploy to Vercel
2. Vercel automatically detects the `vercel.json` cron configuration
3. The cron job runs daily at the specified time
4. No additional setup required!

**View Cron Jobs in Vercel:**
- Go to your project dashboard → Settings → Cron Jobs
- You'll see the scheduled job there

### Option 2: Using node-cron (Development/Local)
The cron job is set up in `lib/cron.ts` and runs at 9:00 AM IST daily.

**Note:** This only works in a long-running process. For Next.js, prefer Vercel Cron in production.

### Option 3: External Cron Service
Use a service like:
- **GitHub Actions** (schedule workflow)
- **External cron service** (call `/api/stocks/update` endpoint)

Example cron command:
```bash
0 9 * * * curl -X POST https://your-domain.com/api/stocks/update \
  -H "Authorization: Bearer your-cron-secret"
```

### Option 4: Manual Update Script
```bash
node scripts/update-stocks.js
```

## 📊 Stock Data

### Using Dummy Data (Default)
The app uses **realistic dummy data** by default for 20 popular Indian stocks. This means:
- ✅ No API keys required
- ✅ Works offline
- ✅ Perfect for development and testing
- ✅ Includes realistic prices, P/E ratios, and market caps

Available stocks include: RELIANCE, TCS, HDFCBANK, INFY, HINDUNILVR, ICICIBANK, BHARTIARTL, SBIN, BAJFINANCE, ITC, and more.

### Using Live NSE Data
The app integrates with the `stock-nse-india` npm package to fetch live data from the National Stock Exchange of India:
- ✅ No API keys required (uses official NSE public endpoints)
- ✅ Real-time stock prices and market data
- ✅ Automatic fallback to dummy data on errors

To switch to live NSE data:

1. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```
   The `stock-nse-india` package is already included in dependencies.

2. **Set environment variable**:
   ```env
   USE_REAL_API=true
   ```

3. **That's it!** The app will automatically use the `stock-nse-india` package to fetch live data from NSE.
   - No API keys required (uses official NSE public endpoints)
   - Real-time stock prices, P/E ratios, market caps, and 52-week highs/lows
   - Automatically falls back to dummy data if API fails

The dummy data structure in `lib/dummyStockData.ts` can be easily extended with more stocks.

## 🎨 Customization

### Adding More Dummy Stocks
Edit `lib/dummyStockData.ts` to add more stocks to the `DUMMY_STOCKS` object.

### Modifying Undervalued Criteria
Edit `lib/getUndervaluedStocks.ts` to adjust the scoring algorithm.

## 🔒 Security Notes

- Never commit `.env` files
- Change `CRON_SECRET` in production
- Use HTTPS in production
- Implement proper authentication for user features

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## 🚢 Deployment

1. Set up a PostgreSQL database (e.g., Supabase, Railway, Neon)
2. Update `DATABASE_URL` in your deployment environment
3. Run migrations: `npx prisma migrate deploy`
4. Configure cron job (see above)
5. Deploy to Vercel, Railway, or your preferred platform

## 📄 License

MIT
