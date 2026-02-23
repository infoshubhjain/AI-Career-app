#!/bin/bash

# Setup Next.js frontend
# This script installs Node dependencies

set -e  # Exit on error

echo "========================================="
echo "⚛️  Frontend Setup Script"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to frontend directory
cd "$(dirname "$0")/frontend"

# Check Node.js version
echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    echo "Please install Node.js 18+ from: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

if [ "$NODE_MAJOR" -ge 18 ]; then
    echo -e "${GREEN}✓ Node.js v$NODE_VERSION found${NC}"
else
    echo -e "${RED}✗ Node.js 18+ required, found v$NODE_VERSION${NC}"
    exit 1
fi
echo ""

# Check npm
echo "Checking npm..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm v$NPM_VERSION found${NC}"
echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ node_modules already exists${NC}"
    read -p "Do you want to reinstall? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing node_modules..."
        rm -rf node_modules package-lock.json
        echo -e "${GREEN}✓ Cleaned up${NC}"
        echo ""
    else
        echo "Skipping installation..."
        echo ""
        echo "========================================="
        echo -e "${GREEN}✓ Frontend already set up!${NC}"
        echo "========================================="
        echo ""
        echo "To start the frontend:"
        echo "  cd frontend"
        echo "  npm run dev"
        echo ""
        echo "Or use: ./start-frontend.sh"
        echo ""
        exit 0
    fi
fi

# Install dependencies
echo "Installing dependencies..."
echo "This may take a few minutes..."
echo ""

if npm install; then
    echo ""
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo ""
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi
echo ""

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file..."
    cat > .env.local << 'EOF'
# API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Supabase (optional - can be empty for roadmap feature)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
EOF
    echo -e "${GREEN}✓ .env.local file created${NC}"
else
    echo -e "${YELLOW}⚠ .env.local already exists (skipping)${NC}"
fi
echo ""

echo "========================================="
echo -e "${GREEN}✓ Frontend setup complete!${NC}"
echo "========================================="
echo ""
echo "To start the frontend:"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Or use: ./start-frontend.sh"
echo ""
echo "The app will be available at:"
echo "  http://localhost:3000"
echo ""
