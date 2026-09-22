# Estimate Generator

Mobile-first app for generating service estimates from work order images using Claude Vision OCR.

## Features

- ✅ Multiple image uploads with Claude Vision OCR
- ✅ Auto-extract job details, pricing, and requirements
- ✅ Bilingual interface (Arabic + English)
- ✅ Real-time estimate calculation
- ✅ Copy estimate to clipboard
- ✅ Mobile optimized (iPhone)

## Setup

### 1. Prerequisites
- Node.js 18+ installed
- GitHub account (for deployment)
- Claude API key from https://console.anthropic.com/account/keys

### 2. Local Development

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your Claude API key to .env.local
# ANTHROPIC_API_KEY=your_key_here

# Run development server
npm run dev
```

Visit http://localhost:3000

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variable when prompted:
# ANTHROPIC_API_KEY = your_api_key
```

## Architecture

- **Frontend:** React + TypeScript (Next.js pages)
- **Backend:** Next.js API routes
- **APIs:** Claude Vision (image OCR) + Claude (translation if needed)
- **Deployment:** Vercel

## How It Works

1. User uploads work order image(s)
2. Claude Vision API extracts text and data
3. Form auto-fills with extracted data (job #, location, service, pricing)
4. User enters material cost and labor hours
5. App calculates total estimate
6. Output can be copied and pasted into messages/emails

## File Structure

```
estimate-generator/
├── pages/
│   ├── api/
│   │   └── extract.ts          # Claude Vision API endpoint
│   ├── _app.tsx                 # App wrapper
│   └── index.tsx                # Main estimate generator UI
├── styles/
│   └── globals.css              # Styles
├── package.json
├── tsconfig.json
├── next.config.js
└── .env.example
```

## Environment Variables

- `ANTHROPIC_API_KEY` - Your Claude API key (required)

## Notes

- API key is never exposed to frontend (secured in backend)
- Estimates are generated on-demand (no database)
- Mobile-optimized for iPhone usage
- All labels support Arabic + English
