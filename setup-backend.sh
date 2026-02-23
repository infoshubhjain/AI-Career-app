#!/bin/bash

# Setup FastAPI backend
# This script creates virtual environment, installs dependencies, and configures environment

set -e  # Exit on error

echo "========================================="
echo "🐍 Backend Setup Script"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to backend directory
cd "$(dirname "$0")/backend"

# Check Python version - try to find the latest available Python 3.11+
echo "Checking Python version..."
PYTHON_CMD=""
PYTHON_VERSION=""

# Try multiple Python commands in order of preference (latest first)
for cmd in python3.13 python3.12 python3.11 python3 python; do
    if command -v "$cmd" &> /dev/null; then
        VERSION=$($cmd --version 2>&1 | awk '{print $2}')
        MAJOR=$(echo $VERSION | cut -d. -f1)
        MINOR=$(echo $VERSION | cut -d. -f2)
        
        # Check if version is 3.11 or higher
        if [ "$MAJOR" -eq 3 ] && [ "$MINOR" -ge 11 ]; then
            PYTHON_CMD="$cmd"
            PYTHON_VERSION="$VERSION"
            echo -e "${GREEN}✓ Found $cmd (Python $PYTHON_VERSION)${NC}"
            break
        elif [ "$MAJOR" -gt 3 ]; then
            PYTHON_CMD="$cmd"
            PYTHON_VERSION="$VERSION"
            echo -e "${GREEN}✓ Found $cmd (Python $PYTHON_VERSION)${NC}"
            break
        fi
    fi
done

# If no suitable Python found, error out
if [ -z "$PYTHON_CMD" ]; then
    echo -e "${RED}✗ Python 3.11+ not found${NC}"
    echo ""
    echo "Available Python versions:"
    for cmd in python3.13 python3.12 python3.11 python3 python; do
        if command -v "$cmd" &> /dev/null; then
            $cmd --version
        fi
    done
    echo ""
    echo "Please install Python 3.11 or higher:"
    echo "  • macOS: brew install python@3.12"
    echo "  • Ubuntu: sudo apt install python3.12"
    echo "  • Or visit: https://www.python.org/downloads/"
    exit 1
fi
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    $PYTHON_CMD -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
fi
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo -e "${GREEN}✓ Virtual environment activated${NC}"
echo ""

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip --quiet
echo -e "${GREEN}✓ pip upgraded${NC}"
echo ""

# Install dependencies
echo "Installing dependencies from requirements.txt..."
if pip install -r requirements.txt --quiet; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi
echo ""

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
# Application
APP_NAME=AI Career App
APP_VERSION=1.0.0
DEBUG=True

# Server
HOST=0.0.0.0
PORT=8000

# CORS
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]

# LLM Configuration
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b

# Supabase (optional - can be empty for roadmap feature)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# OpenRouter (optional - for future use)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${YELLOW}⚠ .env file already exists (skipping)${NC}"
fi
echo ""

# Create necessary directories
echo "Creating directories..."
mkdir -p roadmaps logs
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Run verification script (use venv Python)
echo "Running verification checks..."
echo ""
echo "Python in venv: $(which python)"
python --version
echo ""
if python verify_setup.py; then
    echo ""
    echo "========================================="
    echo -e "${GREEN}✓ Backend setup complete!${NC}"
    echo "========================================="
    echo ""
    echo "To start the backend:"
    echo "  cd backend"
    echo "  source venv/bin/activate"
    echo "  uvicorn app.main:app --reload"
    echo ""
    echo "Or use: ./start-backend.sh"
    echo ""
else
    echo ""
    echo "========================================="
    echo -e "${YELLOW}⚠ Setup complete with warnings${NC}"
    echo "========================================="
    echo ""
    echo "Please check the issues above."
    echo "You may need to:"
    echo "  • Start Ollama: ollama serve"
    echo "  • Pull model: ollama pull qwen2.5:3b"
    echo ""
fi
