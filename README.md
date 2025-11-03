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
- **Axios** for API calls
- **node-cron** for scheduled tasks
- **Chart.js** for stock trend visualization (ready for implementation)
- **Zustand** for global state management (ready for implementation)

## 📦 Installation

1. **Clone the repository** and install dependencies:

```bash
npm install
```

2. **Setup environment variables**:

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/stock_tracker?schema=public"

# NSE/BSE API (use a free API service or NSE official API)
NSE_API_URL="https://www.nseindia.com/api"

# Cron Job Secret
CRON_SECRET="your-secret-key-here-change-in-production"

# Next Auth URL (for cron jobs)
NEXTAUTH_URL="http://localhost:3000"
```

3. **Setup Database**:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

4. **Run the development server**:

```bash
npm run dev
```

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
Fetch real-time data for a single stock.

### `POST /api/stocks/fetch`
Fetch multiple stocks:
```json
{
  "symbols": ["RELIANCE", "TCS", "INFY"]
}
```

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

### Option 1: Using node-cron (Development)
The cron job is set up in `lib/cron.ts` and runs at 9:00 AM IST daily.

### Option 2: External Cron Service (Production)
Use a service like:
- **Vercel Cron** (if deploying on Vercel)
- **GitHub Actions** (schedule workflow)
- **External cron service** (call `/api/stocks/update` endpoint)

Example cron command:
```bash
0 9 * * * curl -X POST https://your-domain.com/api/stocks/update \
  -H "Authorization: Bearer your-cron-secret"
```

### Option 3: Manual Update Script
```bash
node scripts/update-stocks.js
```

## 🎨 Customization

### Adding More Stocks
Stock data is fetched from the NSE API. In development, mock data is generated. To add real stocks:
1. Update the symbols in `lib/stockService.ts`
2. Ensure `NSE_API_URL` is correctly configured
3. Call `/api/stocks/fetch` with the stock symbols

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
