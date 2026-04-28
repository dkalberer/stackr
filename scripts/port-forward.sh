#!/usr/bin/env bash
# scripts/port-forward.sh
# Port-forwards all stackr services to localhost for direct access.
# Runs each forward in the background and prints the PIDs so you can kill them.
set -euo pipefail

NAMESPACE="${NAMESPACE:-stackr}"
RELEASE="${RELEASE:-stackr}"

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${CYAN}[port-forward]${NC} $*"; }

cleanup() {
  echo ""
  info "Caught signal — stopping all port-forwards..."
  kill "${PID_BACKEND}" "${PID_FRONTEND}" "${PID_POSTGRES}" 2>/dev/null || true
  wait 2>/dev/null || true
  echo -e "${YELLOW}All port-forwards stopped.${NC}"
}
trap cleanup INT TERM

# ── Backend ────────────────────────────────────────────────────────────────────
info "Forwarding backend  localhost:8080 → svc/${RELEASE}-backend:8080"
kubectl -n "${NAMESPACE}" port-forward "svc/${RELEASE}-backend" 8080:8080 &
PID_BACKEND=$!

# ── Frontend ───────────────────────────────────────────────────────────────────
info "Forwarding frontend localhost:3000 → svc/${RELEASE}-frontend:80"
kubectl -n "${NAMESPACE}" port-forward "svc/${RELEASE}-frontend" 3000:80 &
PID_FRONTEND=$!

# ── PostgreSQL ─────────────────────────────────────────────────────────────────
info "Forwarding postgres localhost:5432 → svc/${RELEASE}-postgres:5432"
kubectl -n "${NAMESPACE}" port-forward "svc/${RELEASE}-postgres" 5432:5432 &
PID_POSTGRES=$!

echo ""
echo -e "${GREEN}Port-forwards running:${NC}"
printf "  %-12s PID %s\n" "backend"  "${PID_BACKEND}"
printf "  %-12s PID %s\n" "frontend" "${PID_FRONTEND}"
printf "  %-12s PID %s\n" "postgres" "${PID_POSTGRES}"
echo ""
echo "  Backend  →  http://localhost:8080"
echo "  Frontend →  http://localhost:3000"
echo "  Postgres →  localhost:5432"
echo ""
echo "Press Ctrl-C to stop all port-forwards."

wait
