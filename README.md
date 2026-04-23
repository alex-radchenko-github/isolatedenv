# isolatedenv

My awesome project

## Stack

- **Backend**: FastAPI + PostgreSQL + Redis + Celery
- **Auth**: Authentik (self-hosted, OpenID Connect)
- **Frontend**: Next.js (App Router, React Server Components)

## Quick Start

```bash
# Start all services in Docker (frontend + backend + infra)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Run Authentik seed (test users, OAuth2 provider) — waits for completion
docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm seed

# Verify backend is up
curl http://localhost:8010/health
```

### Services

| Service             | URL                            |
|---------------------|--------------------------------|
| Frontend (Next.js)  | http://localhost:3010          |
| Backend API Docs    | http://localhost:8010/docs     |
| Authentik Admin     | http://localhost:9010          |
| PostgreSQL          | localhost:5442 (dev only)      |
| Redis               | localhost:6389 (dev only)      |

## Project Structure

```
isolatedenv/
├── backend/          # FastAPI application
│   ├── app/
│   │   ├── core/     # Config, auth, database, middleware
│   │   ├── users/    # User management module
│   │   └── ...       # Feature modules
│   └── alembic/      # Database migrations
├── frontend/         # Next.js application
├── scripts/          # Utility scripts
└── docker-compose.yml
```

## Test Credentials

Created by the seed script on first run:

| Role  | Email                | Password       |
|-------|----------------------|----------------|
| Admin | admin@example.com    | TestAdmin123!  |
| Paid  | paid@example.com     | TestPaid123!   |
| Free  | free@example.com     | TestFree123!   |

## API Documentation

Once the backend is running, visit:
- Swagger UI: [http://localhost:8010/docs](http://localhost:8010/docs)
- ReDoc: [http://localhost:8010/redoc](http://localhost:8010/redoc)
