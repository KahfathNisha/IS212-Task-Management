#!/bin/bash

# Local CI Checks - Run this before pushing to verify CI will pass
# This script replicates the GitHub Actions CI pipeline locally

set -e  # Exit on any error

echo "🚀 Running local CI checks..."
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any step fails
FAILED=0

# Function to print success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
error() {
    echo -e "${RED}❌ $1${NC}"
    FAILED=1
}

# Function to print info
info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# ==========================================
# FRONTEND CHECKS
# ==========================================
echo "📦 FRONTEND CHECKS"
echo "=================="

cd frontend || exit 1

# 1. Check if node_modules exists, if not run npm ci
if [ ! -d "node_modules" ]; then
    info "Installing frontend dependencies..."
    npm ci
else
    info "Frontend dependencies already installed"
fi

# 2. Run Frontend Tests (excluding integration tests, matching CI)
info "Running frontend unit tests..."
if npm test -- --exclude **/*.integration.spec.js --run; then
    success "Frontend tests passed"
else
    error "Frontend tests failed"
fi

# 3. Build Frontend
info "Building frontend..."
if npm run build; then
    success "Frontend build succeeded"
else
    error "Frontend build failed"
fi

cd ..

echo ""
echo "📦 BACKEND CHECKS"
echo "=================="

cd backend || exit 1

# 1. Check if node_modules exists, if not run npm ci
if [ ! -d "node_modules" ]; then
    info "Installing backend dependencies..."
    npm ci
else
    info "Backend dependencies already installed"
fi

# 2. Run Backend Tests
info "Running backend tests..."
if npm test; then
    success "Backend tests passed"
else
    error "Backend tests failed"
fi

cd ..

echo ""
echo "================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All CI checks passed! Safe to push.${NC}"
    exit 0
else
    echo -e "${RED}💥 Some checks failed. Fix issues before pushing.${NC}"
    exit 1
fi

