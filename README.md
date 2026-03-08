# PR Staffing — Capacity & Planning Tool

A production-quality internal web app for PR agency staffing, capacity management, and plan-vs-actual reporting.

---

## Quick Start

```bash
# 1. Clone / enter the project directory
cd pr-staffing

# 2. Install dependencies
npm install

# 3. Create the database and run migrations
npx prisma db push

# 4. Seed with demo data (offices, employees, clients, rates, allocations, actuals)
npm run db:seed

# 5. Start the development server
npm run dev
```

Then open **http://localhost:3000**.

---

## Demo Login Credentials

| Role | Email | Password |
|------|-------|---------|
| Admin | admin@agency.com | Admin123! |
| Staffing Manager | staffing@agency.com | Staffing123! |
| Finance | finance@agency.com | Finance123! |
| Department Leader | director@agency.com | Director123! |

---

## Features

### Dashboard
- KPI cards: active employees, clients, utilization %, revenue variance
- Monthly hours trend chart (plan vs actual)
- Monthly revenue trend chart (plan vs actual)
- Top clients by planned revenue
- Over-allocation alerts

### Staffing Plan (`/staffing`)
- Select any active client + year + month range
- Spreadsheet-style grid: employees as rows, months as columns
- Toggle between **hours** and **percent** input modes
- Auto-calculates planned revenue from client-specific rates
- Red highlight + indicator when employee is over-allocated
- Utilization bars per employee (all clients combined)
- Auto-save with 700ms debounce
- Add / remove employees from the plan

### Actuals (`/actuals`)
- **View tab**: filter by year, month, client — see all actuals with totals
- **Manual Entry tab**: enter actual hours, revenue, and billings per employee/client/month
- **CSV Import tab**: upload a CSV file (preview before importing), with error reporting per row

### Reports
- **By Employee** (`/reports/employees`): sortable table with plan vs actual hours, revenue, utilization %, average realized rate
- **By Client** (`/reports/clients`): revenue bar chart + sortable table per client with staffing headcount
- **By Month** (`/reports/monthly`): trend charts + utilization bars + full monthly breakdown table
- All reports support **CSV export**

### Admin
- **Employees** (`/admin/employees`): CRUD with job title, office, department; soft deactivate
- **Clients** (`/admin/clients`): CRUD with industry and contact; soft archive
- **Billing Rates** (`/admin/rates`): per-client, per-title rates with effective dates; inline edit
- **Users** (`/admin/users`): CRUD with role assignment; password change

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | SQLite (via Prisma) |
| ORM | Prisma 5 |
| Auth | NextAuth.js v4 (credentials) |
| Styling | Tailwind CSS |
| Charts | Recharts |
| CSV | PapaParse |
| Language | TypeScript |

**Why SQLite?** Zero-config local development; Prisma makes it a 1-line change to switch to PostgreSQL for production.

---

## Switching to PostgreSQL

1. Change `.env.local`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/pr_staffing"
   ```
2. Change `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Run `npx prisma db push && npm run db:seed`

---

## CSV Import Format

### Actuals Import

Headers (required): `employee_email`, `client_code`, `year`, `month`
Optional columns: `actual_hours`, `actual_revenue`, `actual_billings`

```csv
employee_email,client_code,year,month,actual_hours,actual_revenue,actual_billings
sarah.chen@agency.com,LUXB,2025,4,57,18240,16781
marcus.johnson@agency.com,GNLF,2025,4,62,16120,14830
```

- `employee_email` must match an existing employee's email (case-insensitive)
- `client_code` must match an existing client's code (case-insensitive)
- Existing records for the same employee/client/year/month are **overwritten**
- A sample template is at `public/sample-actuals-import.csv`

---

## Business Logic Notes

### Rate Resolution
When computing planned revenue, the system finds the `ClientRate` where:
- `clientId` matches the selected client
- `jobTitleId` matches the employee's job title
- `effectiveFrom` ≤ the first day of the allocation month
- Latest `effectiveFrom` wins if multiple rates match

### Utilization Calculation
```
Utilization % = (Actual Hours / Capacity Hours) × 100
```
Default capacity is **160 hours/month** unless overridden in the Capacity table.

### Over-Allocation Warning
An employee is flagged as over-allocated when:
```
Sum(plannedHours across all clients for a given month) > capacityHours
```
This is a **warning only** — the system does not block saving.

### Planned Revenue
```
Planned Revenue = plannedHours × resolvedHourlyRate
```
Automatically recalculated whenever an allocation is saved.

### Average Realized Rate
```
Avg Realized Rate = actualRevenue / actualHours
```
Only shown when actuals exist.

---

## Seeded Demo Data

| Entity | Count |
|--------|-------|
| Offices | 3 (New York, London, Los Angeles) |
| Departments | 6 |
| Job Titles | 7 |
| Employees | 15 |
| Clients | 10 |
| Billing Rates | 70 (10 clients × 7 titles) |
| Allocations | ~180 (6 months × ~30 plans) |
| Actuals | ~90 (3 months Jan–Mar 2025) |

**Sample clients:** LuxBrand International, TechVision Corp, GreenLeaf Foods, Meridian Health, Atlas Financial Group, Nova Entertainment, Clearpath Mobility, Beacon Retail, Summit Energy, Coastal Properties

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npx prisma db push` | Apply schema to database |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

---

## Project Structure

```
pr-staffing/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Demo data seeder
├── src/
│   ├── app/
│   │   ├── (app)/             # Protected app routes
│   │   │   ├── dashboard/     # KPI + chart dashboard
│   │   │   ├── staffing/      # Staffing plan grid
│   │   │   ├── actuals/       # Actuals view/entry/import
│   │   │   ├── reports/       # Employee, client, monthly reports
│   │   │   └── admin/         # Master data management
│   │   ├── api/               # REST API routes
│   │   └── login/             # Auth page
│   ├── components/
│   │   ├── layout/            # Sidebar, Header
│   │   ├── staffing/          # StaffingGrid component
│   │   ├── actuals/           # ActualsManager component
│   │   └── ui/                # Reusable UI primitives
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── auth.ts            # NextAuth config
│   │   └── utils.ts           # Formatting, calculations, helpers
│   └── types/                 # TypeScript interfaces
└── public/
    └── sample-actuals-import.csv
```

---

## Phase 2 Roadmap

- Role-based access control enforcement (currently all roles see all pages)
- Audit log for allocation and actuals changes
- Department/office filter on all reports
- Multiple years in a single staffing view
- PDF report export
- Email digests for leadership

## Phase 3 Roadmap

- Multi-currency support
- Timesheet system integration (via webhook or scheduled import)
- Capacity planning forecasts
- Client profitability analysis
- Slack notifications for over-allocation alerts
