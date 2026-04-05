# Kubernetes Deployment Guide

This folder contains Kubernetes manifests for the microservice architecture.

## Files

- `namespace.yaml`: Namespace definition (`emprole`).
- `configmap.yaml`: Non-sensitive environment variables.
- `secret.example.yaml`: Secret template (copy and edit before apply).
- `deployments.yaml`: Deployments for gateway, auth, workforce, finance, and frontend.
- `services.yaml`: ClusterIP services for all deployments.
- `ingress.yaml`: Ingress routes for frontend (`/`) and API (`/api`).

## 1. Build and push images

Update image names in `deployments.yaml`:

- `your-dockerhub-user/emprole-api-gateway:latest`
- `your-dockerhub-user/emprole-auth-service:latest`
- `your-dockerhub-user/emprole-workforce-service:latest`
- `your-dockerhub-user/emprole-finance-service:latest`
- `your-dockerhub-user/emprole-frontend:latest`

Build and push:

```bash
# from repository root
docker build -t your-dockerhub-user/emprole-api-gateway:latest -f backend/services/gateway-service/Dockerfile backend/services
docker build -t your-dockerhub-user/emprole-auth-service:latest -f backend/services/auth-service/Dockerfile backend/services
docker build -t your-dockerhub-user/emprole-workforce-service:latest -f backend/services/workforce-service/Dockerfile backend/services
docker build -t your-dockerhub-user/emprole-finance-service:latest -f backend/services/finance-service/Dockerfile backend/services
docker build -t your-dockerhub-user/emprole-frontend:latest -f frontend/Dockerfile frontend

docker push your-dockerhub-user/emprole-api-gateway:latest
docker push your-dockerhub-user/emprole-auth-service:latest
docker push your-dockerhub-user/emprole-workforce-service:latest
docker push your-dockerhub-user/emprole-finance-service:latest
docker push your-dockerhub-user/emprole-frontend:latest
```

## 2. Create secret

Preferred (no secrets in git):

```bash
kubectl create namespace emprole
kubectl -n emprole create secret generic emprole-secrets \
  --from-literal=MONGODB_URI='your-mongodb-uri' \
  --from-literal=JWT_SECRET='your-jwt-secret'
```

Or use `secret.example.yaml` after replacing placeholder values.

## 3. Apply manifests

```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployments.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/ingress.yaml
```

## 4. Verify

```bash
kubectl -n emprole get pods
kubectl -n emprole get svc
kubectl -n emprole get ingress
```

## 5. Local host mapping for ingress

Add to `/etc/hosts`:

```text
127.0.0.1 emprole.local
```

Then open:

- `http://emprole.local` (frontend)
- `http://emprole.local/api/health` (gateway)

## Notes

- The ingress manifest assumes NGINX Ingress Controller (`ingressClassName: nginx`).
- Set `REACT_APP_API_URL` in `configmap.yaml` if you want a full URL instead of `/api`.
- If your cluster needs private registry auth, add an `imagePullSecrets` section to deployments.
