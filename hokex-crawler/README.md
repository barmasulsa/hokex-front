# HOKEX Event Data Crawler

Automatically collects event data from 22 Korean venue websites and stores them in Supabase.

## Features

- 📥 Downloads Excel files from 22 venue websites
- 🔄 Parses and normalizes data to HOKEX standard format
- 🗄️ Stores events in Supabase with pending status
- ✅ Admin approval workflow
- 📅 Monthly/quarterly scheduling
- 🖼️ Handles poster images (with placeholder fallback)
- 🔍 Duplicate detection and data validation
- 📊 Comprehensive logging and monitoring

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Update `.env` with your Supabase credentials

4. Run database migrations in Supabase SQL Editor (see `../hokex-front/supabase-schema.sql`)

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Lint code
npm run lint
npm run lint:fix
```

## Project Structure

```
hokex-crawler/
├── src/
│   ├── adapters/          # Venue-specific adapters (22 venues)
│   ├── core/              # Core business logic
│   ├── services/          # External service integrations
│   ├── api/               # REST API endpoints
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   └── index.ts           # Entry point
├── tests/
│   ├── unit/              # Unit tests
│   ├── property/          # Property-based tests
│   └── integration/       # Integration tests
├── config/
│   ├── venues.json        # Venue configurations
│   └── mappings.json      # Category/industry mappings
└── package.json
```

## Supported Venues

### Seoul (4)
- COEX, COEX Magok, aT Center, SETEC

### Gyeonggi (4)
- KINTEX, Suwon Convention Center, Songdo Convensia, Suwon Messe

### Chungcheong (3)
- Daejeon Convention Center, Sejong Convention Center, Cheongju OSCO

### Jeolla (2)
- Kim Dae-jung Convention Center, Gunsan Convention Center

### Gangwon (2)
- Gangneung Arena, Wonju Convention Center

### Gyeongsang (6)
- BEXCO, EXCO, Changwon Convention Center, UECO, Gyeongju Convention Center, GUMICO

### Jeju (1)
- ICC Jeju

## API Endpoints

- `POST /api/crawl/trigger` - Manually trigger crawl
- `GET /api/crawl/status/:jobId` - Get crawl job status
- `GET /api/crawl/logs` - List crawl logs
- `GET /api/crawl/statistics` - Get crawl statistics
- `GET /api/events/pending` - List pending events
- `POST /api/events/:id/approve` - Approve event
- `POST /api/events/:id/reject` - Reject event

## License

MIT
