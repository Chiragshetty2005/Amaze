# AmazeCare

AmazeCare is a clinic management application with a public marketing site and separate patient, doctor, and administrator workspaces. The repository contains a React frontend and an ASP.NET Core API backed by SQL Server.

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **API:** ASP.NET Core 10, API versioning, Swagger, Serilog, JWT authentication
- **Data:** EF Core 10 with SQL Server 2022
- **Documents:** QuestPDF invoices, MailKit email delivery
- **Tests:** xUnit, Moq, EF Core InMemory
- **Runtime:** Docker Compose with SQL Server and Mailpit

## Repository layout

```text
frontend/                       React application
backend/
  AmazeCare.slnx                .NET solution
  src/AmazeCare.Domain/         Entities and enums
  src/AmazeCare.Application/    Use cases, DTOs, business rules
  src/AmazeCare.Infrastructure/ EF Core, JWT, email, PDF, seed data
  src/AmazeCare.Api/            Controllers, middleware, startup
  tests/AmazeCare.UnitTests/    Unit tests
docker-compose.yml              Full local stack
.github/workflows/ci.yml       Backend and frontend CI
```

## Quick start with Docker

```bash
docker compose up --build
```

| Service | URL |
| --- | --- |
| Web app | http://localhost:3000 |
| API | http://localhost:5250 |
| Swagger | http://localhost:5250/swagger |
| Mailpit inbox | http://localhost:8025 |
| SQL Server | `localhost:1433` |

The API applies the EF Core migration and seeds the demo clinic on first start. Seeded appointments are relative to the day the database is first created. To start from a clean database:

```bash
docker compose down -v
docker compose up --build
```

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Patient | `patient@amazecare.test` | `Patient@123` |
| Doctor | `doctor@amazecare.test` | `Doctor@123` |
| Admin | `admin@amazecare.test` | `Admin@123` |

Other seeded doctors and patients have accounts with unguessable passwords. They are not demo sign-ins. When an administrator creates a doctor or patient, the API sends a one-time setup link instead of assigning a shared password.

## Local development

### Prerequisites

- .NET SDK 10
- Node.js 22 or later
- SQL Server 2022, or the Docker database: `docker compose up -d db mailpit`

### API

```bash
dotnet restore backend/AmazeCare.slnx
dotnet run --project backend/src/AmazeCare.Api
```

The development profile listens on `http://localhost:5250`. On first start it migrates the database and seeds demo data. Set `Database__AutoMigrate=false` if you prefer to run migrations manually.

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

The Vite app runs on `http://localhost:5173`. During API integration, point the frontend at `http://localhost:5250` or use the Docker web proxy at `/api`.

### Tests

```bash
dotnet test backend/AmazeCare.slnx
cd frontend && npm run lint && npm run build
```

## Database migrations

The local tool manifest installs `dotnet-ef`:

```bash
dotnet tool restore
dotnet tool run dotnet-ef migrations add <Name> \
  --project backend/src/AmazeCare.Infrastructure \
  --startup-project backend/src/AmazeCare.Api \
  --output-dir Persistence/Migrations

dotnet tool run dotnet-ef database update \
  --project backend/src/AmazeCare.Infrastructure \
  --startup-project backend/src/AmazeCare.Api
```

## Configuration

Configuration is read from `appsettings.json`, `appsettings.Development.json`, environment variables, and secret stores.

| Setting | Purpose |
| --- | --- |
| `ConnectionStrings__DefaultConnection` | SQL Server connection string |
| `Jwt__Key` | JWT signing key; at least 32 bytes |
| `Jwt__Issuer`, `Jwt__Audience` | Token issuer and audience |
| `Jwt__AccessTokenMinutes` | Access token lifetime |
| `Jwt__RefreshTokenDays` | Refresh token lifetime |
| `Email__Enabled` | Enables SMTP delivery |
| `Email__Host`, `Email__Port`, `Email__SecureSocketOptions` | SMTP server |
| `Email__FromAddress`, `Email__FromName` | Sender identity |
| `App__FrontendBaseUrl` | Base URL used in reset and invitation links |
| `Cors__AllowedOrigins__0...` | Allowed browser origins |
| `Database__AutoMigrate` | Apply migrations on startup |
| `Database__SeedDemoData` | Seed demo data when the database is empty |

The `Jwt:Key` value in the Docker Compose file is a development placeholder. Replace it with a secret-manager value before exposing the stack outside a local machine.

## API overview

All routes are versioned, for example `POST /api/v1/auth/login`. Authenticated requests use `Authorization: Bearer <access-token>`.

- `POST /api/v1/auth/login`, `refresh`, `logout`, `forgot-password`, `reset-password`, `change-password`
- `GET/PUT /api/v1/auth/me`
- `GET /api/v1/specializations`
- `GET /api/v1/doctors`, `GET /api/v1/doctors/{id}`, `GET /api/v1/doctors/{id}/slots`
- `GET /api/v1/appointments`; booking, rescheduling, confirmation, rejection, and cancellation actions
- `GET/POST /api/v1/consultations`; role-filtered records and prescription data
- `GET /api/v1/invoices`, `GET /api/v1/invoices/{id}/pdf`, email delivery, and payment marking
- `GET /api/v1/medicines`, `GET /api/v1/medicaltests`
- `GET /api/v1/reports/overview`, `revenue`, `doctors` (admin only)
- Admin CRUD for doctors, patients, departments, medicines, and tests

Swagger documents request shapes, authorization requirements, and response models.

## Business rules

- Public pages can list departments and search doctors without signing in.
- A patient books a request; a doctor or administrator confirms it.
- A slot must be within the doctor's availability window, align to the slot grid, be in the future, and be free.
- A patient cannot hold two active appointments at the same time.
- Only a confirmed appointment can be completed into a consultation.
- Prescriptions save the medicine name as a snapshot and use the `0-0-0` pattern with `AF` or `BF`.
- Completing a consultation marks the appointment completed and creates an invoice for the consultation fee plus selected tests.
- Invoices use a 5% tax rate and an `INV-YYYY-0001` number. The A4 PDF contains only the invoice.
- Departments with active doctors cannot be deleted until those doctors are reassigned.
- Doctors, patients, medicines, and tests are retired rather than hard-deleted so medical history remains readable.
- Patient, doctor, and admin data access is enforced in the application layer, not only at the controller.
