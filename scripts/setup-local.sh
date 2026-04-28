#!/usr/bin/env bash
# scripts/setup-local.sh
# Provisions a local kind cluster with ingress-nginx for stackr development.
set -euo pipefail

CLUSTER_NAME="wingert-local"
NAMESPACE="stackr"

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Prerequisite check ─────────────────────────────────────────────────────────
info "Checking required tools..."
for tool in kind kubectl helm; do
  if command -v "$tool" &>/dev/null; then
    success "$tool found: $(command -v "$tool")"
  else
    error "$tool is not installed. Please install it and re-run this script."
  fi
done

# ── kind cluster ───────────────────────────────────────────────────────────────
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
  warn "kind cluster '${CLUSTER_NAME}' already exists — skipping creation."
else
  info "Creating kind cluster '${CLUSTER_NAME}'..."
  cat <<EOF | kind create cluster --name "${CLUSTER_NAME}" --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
EOF
  success "Cluster '${CLUSTER_NAME}' created."
fi

kubectl cluster-info --context "kind-${CLUSTER_NAME}"

# ── ingress-nginx ──────────────────────────────────────────────────────────────
info "Adding ingress-nginx Helm repo..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
helm repo update

info "Installing / upgrading ingress-nginx..."
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.hostPort.enabled=true \
  --set controller.service.type=NodePort \
  --set controller.nodeSelector."ingress-ready"="true" \
  --wait --timeout=5m

# ── Wait for ingress controller to become ready ────────────────────────────────
info "Waiting for ingress-nginx controller to be ready..."
kubectl rollout status deployment/ingress-nginx-controller \
  -n ingress-nginx \
  --timeout=3m
success "ingress-nginx is ready."

# ── Application namespace ──────────────────────────────────────────────────────
info "Ensuring namespace '${NAMESPACE}' exists..."
kubectl get namespace "${NAMESPACE}" &>/dev/null || kubectl create namespace "${NAMESPACE}"
success "Namespace '${NAMESPACE}' is ready."

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  stackr local cluster is ready!               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Next steps:"
echo "    1. Add to /etc/hosts:  127.0.0.1  stackr.localhost"
echo "    2. Run:  task dev          (build → load → helm deploy)"
echo "    3. Open: http://stackr.localhost"
echo ""
