#!/bin/bash

# Start all services (Ollama, Backend, Frontend) in background using tmux
# This allows you to see all logs in one terminal

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "🚀 Starting All Services"
echo "========================================="
echo ""

# Navigate to project root
cd "$(dirname "$0")"

# Check if tmux is available
USE_TMUX=false
if command -v tmux &> /dev/null; then
    USE_TMUX=true
    echo "Using tmux for multi-pane layout"
else
    echo "tmux not found - will start services in background"
    echo "Install tmux for better experience: brew install tmux"
fi
echo ""

# Kill existing session if it exists
if $USE_TMUX; then
    tmux kill-session -t aicareer 2>/dev/null || true
fi

# Start Ollama if not running
echo "Checking Ollama..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${YELLOW}Starting Ollama...${NC}"
    ollama serve > /dev/null 2>&1 &
    sleep 2
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Ollama started${NC}"
    else
        echo -e "${RED}✗ Failed to start Ollama${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Ollama already running${NC}"
fi
echo ""

if $USE_TMUX; then
    # Create a new tmux session with panes for backend and frontend
    echo "Creating tmux session 'aicareer'..."
    echo ""
    
    # Create session with first window
    tmux new-session -d -s aicareer -n services
    
    # Split window horizontally
    tmux split-window -h -t aicareer:services
    
    # Send commands to panes
    # Pane 0: Backend
    tmux send-keys -t aicareer:services.0 "cd $(pwd) && ./start-backend.sh" C-m
    
    # Pane 1: Frontend
    tmux send-keys -t aicareer:services.1 "cd $(pwd) && sleep 5 && ./start-frontend.sh" C-m
    
    # Make layout nice
    tmux select-layout -t aicareer:services even-horizontal
    
    echo "========================================="
    echo -e "${GREEN}✓ All services starting!${NC}"
    echo "========================================="
    echo ""
    echo "📊 Services:"
    echo "  • Ollama: http://localhost:11434"
    echo "  • Backend: http://localhost:8000"
    echo "  • Frontend: http://localhost:3000"
    echo ""
    echo "📚 Quick Links:"
    echo "  • App: http://localhost:3000/roadmap"
    echo "  • API Docs: http://localhost:8000/docs"
    echo ""
    echo "🎮 Tmux Controls:"
    echo "  • Switch panes: Ctrl+b then arrow keys"
    echo "  • Scroll mode: Ctrl+b then ["
    echo "  • Exit scroll: q"
    echo "  • Detach: Ctrl+b then d"
    echo "  • Kill session: tmux kill-session -t aicareer"
    echo ""
    echo "Attaching to tmux session..."
    sleep 2
    
    # Attach to the session
    tmux attach-session -t aicareer
    
else
    # Fallback: Start in background without tmux
    echo "Starting backend..."
    (cd backend && source venv/bin/activate && python -m uvicorn app.main:app --reload > ../logs/backend.log 2>&1) &
    BACKEND_PID=$!
    sleep 3
    
    echo "Starting frontend..."
    (cd frontend && npm run dev > ../logs/frontend.log 2>&1) &
    FRONTEND_PID=$!
    sleep 3
    
    # Create a log directory
    mkdir -p logs
    
    echo ""
    echo "========================================="
    echo -e "${GREEN}✓ All services started!${NC}"
    echo "========================================="
    echo ""
    echo "📊 Services (running in background):"
    echo "  • Ollama: http://localhost:11434"
    echo "  • Backend: http://localhost:8000 (PID: $BACKEND_PID)"
    echo "  • Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
    echo ""
    echo "📚 Quick Links:"
    echo "  • App: http://localhost:3000/roadmap"
    echo "  • API Docs: http://localhost:8000/docs"
    echo ""
    echo "📋 Logs:"
    echo "  • Backend: tail -f logs/backend.log"
    echo "  • Frontend: tail -f logs/frontend.log"
    echo ""
    echo "🛑 To stop all services:"
    echo "  kill $BACKEND_PID $FRONTEND_PID"
    echo "  Or use: ./stop-all.sh"
    echo ""
    
    # Save PIDs for stop script
    echo "$BACKEND_PID" > logs/backend.pid
    echo "$FRONTEND_PID" > logs/frontend.pid
fi
