# EmpRole

EmpRole is a role-based employee management platform with a React frontend, a microservice backend, and an optional machine learning service for attrition prediction.

## What it includes

- Authentication, registration, password reset, and user management
- Workforce management for employees and timesheets
- Finance workflows for expenses and monthly reports
- Attrition prediction API backed by a trained ML model
- Role-based access for admin, manager, and standard user flows

## Architecture

- Frontend: React app in `frontend/`
- API gateway: `backend/services/gateway-service`
- Auth service: `backend/services/auth-service`
- Workforce service: `backend/services/workforce-service`
- Finance service: `backend/services/finance-service`
- ML service: `backend/services/ml-service`
- Shared backend utilities: `backend/services/shared`

The frontend talks to the gateway at `/api` by default. The gateway proxies requests to the domain services.

## Service ports

- Frontend: `5001`
- Gateway: `5002`
- Auth service: `5003`
- Workforce service: `5004`
- Finance service: `5005`
- ML service: `8000`

## Prerequisites

- Docker and Docker Compose for the easiest setup
- Node.js 18+ if you want to run the frontend or backend services without Docker
- MongoDB for the auth, workforce, and finance services

## Quick Start

From the repository root:

```bash
docker compose up --build
```

Then open the app at `http://localhost:5001`.

## Environment Variables

### Backend

The backend services load shared values from `backend/.env`. At minimum, you will need:

- `MONGODB_URI`
- `JWT_SECRET`

The gateway also uses these service URLs in Docker Compose:

- `AUTH_SERVICE_URL`
- `WORKFORCE_SERVICE_URL`
- `FINANCE_SERVICE_URL`
- `ML_SERVICE_URL`

### Frontend

The frontend uses `REACT_APP_API_URL` when you want to override the default `/api` base URL. With the Docker Compose setup, the default works because the frontend proxies requests to the gateway.

## Local Development

If you want to run parts of the stack manually, start them in this order:

1. Backend services and gateway
2. ML service
3. Frontend

Each service has its own `package.json` and `start` script inside `backend/services/*` or `frontend/`.

## Smoke Test

The repository includes a gateway smoke test that starts the stack and checks the main health and auth-protected routes:

```bash
chmod +x backend/services/smoke-test.sh
./backend/services/smoke-test.sh
```

## Kubernetes Deployment

Kubernetes manifests live in `k8s/`.

Key files:

- `k8s/namespace.yaml`
- `k8s/configmap.yaml`
- `k8s/secret.example.yaml`
- `k8s/deployments.yaml`
- `k8s/services.yaml`
- `k8s/ingress.yaml`

For the full deployment flow, see `k8s/README.md`.

## Frontend Routes

The main application routes include:

- `/login`
- `/dashboard`
- `/profile`
- `/employees`
- `/timesheets`
- `/expenses`
- `/reports`
- `/attrition-prediction`
- `/user-management`

## API Overview

The gateway exposes these main API groups:

- `/api/auth`
- `/api/password-reset`
- `/api/user-management`
- `/api/employees`
- `/api/timesheets`
- `/api/expenses`
- `/api/reports`
- `/api/attrition`

Health checks are available on each service at `/api/health`, and the ML service also exposes `/api/attrition/health`.

## Notes

- The backend is split into standalone services under `backend/services/`.
- The ML service loads its model from `backend/services/ml-service/employee_attrition_model.pkl` by default, or from `MODEL_PATH` when set.
- More detailed service-specific notes live in `backend/services/README.md`.
