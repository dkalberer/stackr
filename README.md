# stackr

A personal net worth and savings rate tracking PWA. Track assets, liabilities, and savings progress over time with a clean, fast interface that works offline.

## Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | React + TypeScript + Vite (PWA)         |
| Backend   | Go (net/http)                           |
| Database  | PostgreSQL 16                           |
| Container | Docker                                  |
| K8s       | kind (local) / any K8s (prod)           |
| Helm      | charts/stackr                    |
| CI        | GitHub Actions                          |

---

## Development setup (kind + Taskfile)

### Prerequisites

Install the following tools:

- [kind](https://kind.sigs.k8s.io/) — `brew install kind`
- [kubectl](https://kubernetes.io/docs/tasks/tools/) — `brew install kubectl`
- [helm](https://helm.sh/) — `brew install helm`
- [Task](https://taskfile.dev/) — `brew install go-task`
- [Go 1.24+](https://go.dev/) — `brew install go`
- [Node 22 + pnpm 9](https://pnpm.io/) — `brew install node && npm i -g pnpm`
- [golang-migrate](https://github.com/golang-migrate/migrate) — for DB migrations

### First-time cluster setup

```bash
# Create kind cluster and install ingress-nginx
task setup

# Or use the script directly
bash scripts/setup-local.sh

# Add to /etc/hosts
echo "127.0.0.1  stackr.localhost" | sudo tee -a /etc/hosts
```

### Full dev cycle (build → load → deploy)

```bash
task dev
```

This builds both Docker images, loads them into the kind cluster, and deploys via Helm.

### Running services individually (faster iteration)

```bash
# Terminal 1 — backend with live reload
task dev:backend

# Terminal 2 — frontend Vite dev server (HMR)
task dev:frontend
```

### Available tasks

```
task                  # List all tasks
task build            # Build all Docker images
task load             # Load images into kind
task deploy           # Helm upgrade --install
task dev              # build + load + deploy
task dev:backend      # go run ./cmd/server/
task dev:frontend     # pnpm --filter frontend dev
task test             # Run all tests
task lint             # Lint all
task port-forward     # Port-forward all services
task logs:backend     # Tail backend logs
task logs:frontend    # Tail frontend logs
task clean            # Delete kind cluster
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                    │
│  React PWA (Vite)  ─── service worker ─── offline cache    │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────────┐
│  Ingress (nginx-ingress)                                    │
│   /          → frontend service (nginx)                     │
│   /api/*     → backend service (Go)                         │
└──────┬──────────────────────┬───────────────────────────────┘
       │                      │
┌──────▼──────┐      ┌────────▼────────┐
│  Frontend   │      │    Backend      │
│  nginx pod  │      │    Go pod(s)    │
│  :80        │      │    :8080        │
└─────────────┘      └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │   PostgreSQL    │
                     │  StatefulSet    │
                     │  :5432          │
                     └─────────────────┘
```

### Repository layout

```
stackr/
├── apps/
│   ├── backend/          Go API server
│   │   ├── cmd/server/   main entry point
│   │   ├── internal/     packages (handlers, store, auth, …)
│   │   └── migrations/   SQL migration files
│   └── frontend/         React + Vite PWA
├── charts/
│   └── stackr/    Helm chart
│       ├── templates/
│       │   ├── backend/
│       │   ├── frontend/
│       │   ├── postgres/
│       │   ├── ingress.yaml
│       │   └── secrets.yaml
│       ├── values.yaml
│       ├── values.local.yaml
│       └── values.prod.yaml
├── scripts/
│   ├── setup-local.sh
│   └── port-forward.sh
├── .github/workflows/ci.yaml
├── Taskfile.yml
├── go.work
└── pnpm-workspace.yaml
```

---

## Environment variables

### Backend

| Variable      | Default                | Description                        |
|---------------|------------------------|------------------------------------|
| `PORT`        | `8080`                 | HTTP listen port                   |
| `DB_HOST`     | `localhost`            | PostgreSQL host                    |
| `DB_PORT`     | `5432`                 | PostgreSQL port                    |
| `DB_NAME`     | `stackr`        | Database name                      |
| `DB_USER`     | `stackr`        | Database user                      |
| `DB_PASSWORD` | —                      | Database password (required)       |
| `JWT_SECRET`  | —                      | JWT signing secret (required)      |
| `CORS_ORIGIN` | `http://localhost:5173`| Allowed CORS origin                |

### Frontend

| Variable        | Default                  | Description            |
|-----------------|--------------------------|------------------------|
| `VITE_API_URL`  | `http://localhost:8080`  | Backend base URL       |

Copy `.env.local.example` to `.env.local` and fill in values for local development.

---

## API summary

All API routes are prefixed with `/api/v1`.

| Method | Path               | Description                         |
|--------|--------------------|-------------------------------------|
| GET    | `/health`          | Health check                        |
| POST   | `/auth/register`   | Register a new user                 |
| POST   | `/auth/login`      | Obtain a JWT                        |
| GET    | `/accounts`        | List accounts                       |
| POST   | `/accounts`        | Create an account                   |
| PUT    | `/accounts/:id`    | Update an account                   |
| DELETE | `/accounts/:id`    | Delete an account                   |
| GET    | `/snapshots`       | List net worth snapshots            |
| POST   | `/snapshots`       | Record a net worth snapshot         |
| GET    | `/transactions`    | List transactions                   |
| POST   | `/transactions`    | Record a transaction                |

---

## Database migrations

Migrations live in `apps/backend/migrations/` and are managed by [golang-migrate](https://github.com/golang-migrate/migrate).

---

## CI

GitHub Actions runs on every push and pull request:

1. **test-backend** — `go vet` + `go test -race` + `go build`
2. **test-frontend** — type-check + Vitest + Vite build
3. **build-images** — builds and pushes to GHCR (main branch only)

Images are tagged with the short commit SHA (`sha-<hash>`) and `latest`.

---

## Deployment

### Local (kind)

```bash
task setup   # once
task dev     # on every change
```

### Production

1. Push images to your registry (CI does this automatically from `main`).
2. Override `values.prod.yaml` with real secrets (use Sealed Secrets or External Secrets Operator).
3. Run Helm:

```bash
helm upgrade --install stackr ./charts/stackr \
  --namespace stackr \
  --create-namespace \
  --values ./charts/stackr/values.prod.yaml \
  --set backend.image.tag=sha-<commit> \
  --set frontend.image.tag=sha-<commit> \
  --set secrets.dbPassword="$DB_PASSWORD" \
  --set secrets.jwtSecret="$JWT_SECRET"
```

---

## Contributing

1. Fork and clone the repo.
2. Run `task setup` to provision the local cluster.
3. Copy `.env.local.example` to `.env.local`.
4. Run `task dev:backend` and `task dev:frontend` in separate terminals.
5. Open a PR — CI will run automatically.
