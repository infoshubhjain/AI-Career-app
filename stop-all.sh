#!/bin/bash

# Stop all services

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "🛑 Stopping All Services"
echo "========================================="
echo ""

# Navigate to project root
cd "$(dirname "$0")"

# Stop tmux session if it exists
if command -v tmux &> /dev/null; then
    if tmux has-session -t aicareer 2>/dev/null; then
        echo "Stopping tmux session..."
        tmux kill-session -t aicareer
        echo -e "${GREEN}✓ Tmux session stopped${NC}"
    fi
fi

# Stop processes on ports
echo "Stopping services on ports..."

# Stop backend (port 8000)
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Stopping backend (port 8000)..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✓ Backend stopped${NC}"
fi

# Stop frontend (port 3000)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Stopping frontend (port 3000)..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✓ Frontend stopped${NC}"
fi

# Stop processes by PID files
if [ -d "logs" ]; then
    if [ -f "logs/backend.pid" ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo "Stopping backend (PID: $BACKEND_PID)..."
            kill $BACKEND_PID 2>/dev/null || true
        fi
        rm logs/backend.pid
    fi
    
    if [ -f "logs/frontend.pid" ]; then
        FRONTEND_PID=$(cat logs/frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo "Stopping frontend (PID: $FRONTEND_PID)..."
            kill $FRONTEND_PID 2>/dev/null || true
        fi
        rm logs/frontend.pid
    fi
fi

echo ""
echo "========================================="
echo -e "${GREEN}✓ All services stopped${NC}"
echo "========================================="
echo ""
echo "Note: Ollama is still running in the background."
echo "To stop Ollama: killall ollama"
echo ""
