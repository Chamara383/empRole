# Backend Microservices

This folder contains standalone backend services extracted from the monolith.

## Services

- `gateway-service` (port `5002`): Routes API requests to domain services.
- `auth-service` (port `5003`): Auth, password reset, and user management.
- `workforce-service` (port `5004`): Employees and timesheets.
- `finance-service` (port `5005`): Expenses and reports.
- `shared`: Reusable backend modules (db connector, CORS helper, and middleware factories).

## Start with Docker Compose

From the repository root:

```bash
docker compose up --build
```

## Gateway Smoke Test

From the repository root:

```bash
chmod +x backend/services/smoke-test.sh
./backend/services/smoke-test.sh
```

## Health Endpoints

- Gateway: `GET /api/health` on port `5002`
- Auth: `GET /api/health` on port `5003`
- Workforce: `GET /api/health` on port `5004`
- Finance: `GET /api/health` on port `5005`

## Notes

- Each service has its own `package.json`, `Dockerfile`, and `server.js`.
- Domain services connect directly to MongoDB using `MONGODB_URI` from `backend/.env`.
- Gateway does not connect to MongoDB.
