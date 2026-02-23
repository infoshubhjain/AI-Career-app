#!/bin/bash

# Start the Next.js frontend development server

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "⚛️  Starting Next.js Frontend"
echo "========================================="
echo ""

# Navigate to frontend directory
cd "$(dirname "$0")/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${RED}✗ node_modules not found${NC}"
    echo "Please run setup first: ./setup-frontend.sh"
    exit 1
fi

# Check if backend is running
echo "Checking backend connection..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${YELLOW}⚠ Backend is not running${NC}"
    echo "Please start the backend first: ./start-backend.sh"
    echo "Or continue anyway (some features may not work)"
fi
echo ""

# Check if port 3000 is already in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port 3000 is already in use${NC}"
    echo "Killing existing process..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Start the development server
echo -e "${BLUE}Starting development server on http://localhost:3000${NC}"
echo ""
echo "Pages available:"
echo "  • Landing: http://localhost:3000"
echo "  • Roadmap: http://localhost:3000/roadmap"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo "========================================="
echo ""

# Start Next.js dev server
npm run dev
