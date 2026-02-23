#!/bin/bash

# Start the FastAPI backend server
# This script activates the virtual environment and starts uvicorn

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "🐍 Starting FastAPI Backend"
echo "========================================="
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${RED}✗ Virtual environment not found${NC}"
    echo "Please run setup first: ./setup-backend.sh"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ .env file not found${NC}"
    echo "Please run setup first: ./setup-backend.sh"
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Verify Python version in venv
VENV_PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}✓ Virtual environment activated${NC}"
echo "  Python version: $VENV_PYTHON_VERSION"
echo "  Python path: $(which python)"
echo ""

# Check if Ollama is running
echo "Checking Ollama service..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Ollama service is not running${NC}"
    echo "Starting Ollama in background..."
    ollama serve > /dev/null 2>&1 &
    sleep 2
    
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Ollama started${NC}"
    else
        echo -e "${RED}✗ Failed to start Ollama${NC}"
        echo "Please start manually: ollama serve"
    fi
else
    echo -e "${GREEN}✓ Ollama is running${NC}"
fi
echo ""

# Check if port 8000 is already in use
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port 8000 is already in use${NC}"
    echo "Killing existing process..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Start the server
echo -e "${BLUE}Starting server on http://localhost:8000${NC}"
echo ""
echo "API Documentation will be available at:"
echo "  • Swagger UI: http://localhost:8000/docs"
echo "  • ReDoc: http://localhost:8000/redoc"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo "========================================="
echo ""

# Start uvicorn with auto-reload (using venv Python)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
