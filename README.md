# South African Financial Compliance App

A professional, production-ready web application for South African companies to assess financial compliance and audit readiness. Aligned with IFRS, the South African Companies Act, and SARS tax requirements.

## Features

- **Company Setup** – Capture company name, industry, and financial year-end. Support multiple companies.
- **Trial Balance Upload** – Upload CSV or Excel. Validates debits = credits and required columns.
- **Compliance Check Engine** – IFRS, Companies Act, and SARS tax checks with clear risk scoring.
- **Automated Data Validation** – Balance checks, large values, missing accounts, duplicates.
- **Compliance Scoring** – Overall % and risk level (Low / Medium / High).
- **Audit Readiness Report** – Professional report with executive summary, issues, recommendations. Export to PDF.
- **Dashboard** – Compliance score, issue count, risk breakdown.
- **Admin Configuration** – View compliance rules and scoring logic.

## Tech Stack

- Next.js 14, TypeScript, Tailwind CSS
- Prisma with SQLite
- React PDF for report export

## Prerequisites

- Node.js 18+
- pnpm

## Setup

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env if needed (DATABASE_URL defaults to file:./dev.db)

# Generate Prisma client and create database
pnpm run db:generate
pnpm run db:push

# Seed compliance rules and sample data (South African trial balance)
pnpm run db:seed
```

If `prisma` is not found on Windows, run:
```bash
pnpm exec prisma generate
pnpm exec prisma db push
```

## Run

```bash
# Development (port 3000)
pnpm run dev

# Production build
pnpm run build
pnpm start
```

Open [http://localhost:3000](http://localhost:3000).

## Workflow

1. **Add Company** – Companies → Add Company. Enter name, industry, financial year-end.
2. **Upload Trial Balance** – Company → Upload Trial Balance. Use CSV or Excel with columns: `accountCode`, `accountName`, `debit`, `credit`. Ensure debits equal credits.
3. **View Report** – Compliance checks run automatically. View report and download PDF.

## Sample Data

The seed creates **Acme Trading (Pty) Ltd** with a realistic South African trial balance (ZAR) including:
- Share capital, retained earnings
- Revenue, cost of sales, operating expenses
- VAT Input/Output, PAYE, UIF
- Trade receivables/payables
- Bank, fixed assets, income tax

## Trial Balance File Format

**CSV Example:**
```csv
accountCode,accountName,debit,credit
1000,Share Capital,0,500000
1100,Retained Earnings,0,125000
2000,Revenue,0,850000
...
```

**Accepted column names:** `accountCode`/`code`, `accountName`/`name`, `debit`/`debits`, `credit`/`credits`.

## Environment Variables

| Variable       | Description                     | Default        |
|----------------|---------------------------------|----------------|
| DATABASE_URL   | Prisma database connection      | `file:./dev.db` |

## License

Private use.
