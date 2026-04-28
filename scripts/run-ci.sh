#!/usr/bin/env bash
set -euo pipefail

echo "═══════════════════════════════════════"
echo "  stackr – lokale CI-Pipeline"
echo "═══════════════════════════════════════"

# ── Backend ────────────────────────────────
echo ""
echo "▶ Backend: vet"
(cd apps/backend && go vet ./...)

echo "▶ Backend: build"
(cd apps/backend && go build ./...)

echo "▶ Backend: test"
(cd apps/backend && go test ./... -timeout 300s)

# ── Frontend ───────────────────────────────
echo ""
echo "▶ Frontend: install"
pnpm install --frozen-lockfile

echo "▶ Frontend: lint"
(cd apps/frontend && pnpm lint)

echo "▶ Frontend: test"
(cd apps/frontend && pnpm run test -- --run)

echo "▶ Frontend: build"
(cd apps/frontend && pnpm build)

# ── Helm ───────────────────────────────────
echo ""
echo "▶ Helm: lint"
helm lint ./charts/stackr -f charts/stackr/values.yaml -f charts/stackr/values.local.yaml

echo ""
echo "✓ CI-Pipeline erfolgreich"
