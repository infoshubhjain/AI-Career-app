#!/bin/bash

# Master setup script - runs all setup scripts in order
# This is the one-command setup for the entire AI Career App

set -e  # Exit on error

echo "========================================="
echo "🚀 AI Career App - Complete Setup"
echo "========================================="
echo ""
echo "This script will set up:"
echo "  1. Ollama (LLM runtime)"
echo "  2. Backend (FastAPI)"
echo "  3. Frontend (Next.js)"
echo ""
echo "This may take 5-10 minutes depending on your connection."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to project root
cd "$(dirname "$0")"

# Keep track of failures
FAILURES=0

# Step 1: Setup Ollama
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1/3: Setting up Ollama${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if bash setup-ollama.sh; then
    echo -e "${GREEN}✓ Ollama setup successful${NC}"
else
    echo -e "${RED}✗ Ollama setup failed${NC}"
    FAILURES=$((FAILURES + 1))
fi
echo ""
sleep 1

# Step 2: Setup Backend
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2/3: Setting up Backend${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if bash setup-backend.sh; then
    echo -e "${GREEN}✓ Backend setup successful${NC}"
else
    echo -e "${RED}✗ Backend setup failed${NC}"
    FAILURES=$((FAILURES + 1))
fi
echo ""
sleep 1

# Step 3: Setup Frontend
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3/3: Setting up Frontend${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if bash setup-frontend.sh; then
    echo -e "${GREEN}✓ Frontend setup successful${NC}"
else
    echo -e "${RED}✗ Frontend setup failed${NC}"
    FAILURES=$((FAILURES + 1))
fi
echo ""

# Final summary
echo "========================================="
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✓ Complete setup finished successfully!${NC}"
    echo "========================================="
    echo ""
    echo "🎉 You're ready to go!"
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Start all services:"
    echo "   ./start-all.sh"
    echo ""
    echo "   Or start them individually:"
    echo "   ./start-backend.sh   (Terminal 1)"
    echo "   ./start-frontend.sh  (Terminal 2)"
    echo ""
    echo "2. Visit the app:"
    echo "   http://localhost:3000/roadmap"
    echo ""
    echo "3. Try a query:"
    echo '   "How to become a data scientist"'
    echo ""
    echo "📚 Documentation:"
    echo "   • Quick Start: QUICKSTART.md"
    echo "   • Full Docs: docs/roadmap.md"
    echo "   • Setup Guide: docs/roadmap-setup.md"
    echo ""
else
    echo -e "${RED}✗ Setup completed with $FAILURES error(s)${NC}"
    echo "========================================="
    echo ""
    echo "Please check the errors above and:"
    echo "  • Review the output for specific issues"
    echo "  • Check docs/roadmap-setup.md for troubleshooting"
    echo "  • Run individual setup scripts to isolate issues"
    echo ""
    exit 1
fi
