#!/bin/bash

# System Test Script
# Tests that all components are working correctly

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "🧪 AI Career App - System Test"
echo "========================================="
echo ""

FAILURES=0

# Test 1: Check Ollama
echo -e "${BLUE}Test 1/5: Checking Ollama${NC}"
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Ollama is running${NC}"
else
    echo -e "${RED}✗ Ollama is not running${NC}"
    echo "  Start with: ollama serve"
    FAILURES=$((FAILURES + 1))
fi
echo ""

# Test 2: Check Backend
echo -e "${BLUE}Test 2/5: Checking Backend${NC}"
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    RESPONSE=$(curl -s http://localhost:8000/health)
    if echo "$RESPONSE" | grep -q "healthy"; then
        echo -e "${GREEN}✓ Backend is running and healthy${NC}"
    else
        echo -e "${YELLOW}⚠ Backend is running but health check failed${NC}"
        FAILURES=$((FAILURES + 1))
    fi
else
    echo -e "${RED}✗ Backend is not running${NC}"
    echo "  Start with: ./start-backend.sh"
    FAILURES=$((FAILURES + 1))
fi
echo ""

# Test 3: Check Frontend
echo -e "${BLUE}Test 3/5: Checking Frontend${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${RED}✗ Frontend is not running${NC}"
    echo "  Start with: ./start-frontend.sh"
    FAILURES=$((FAILURES + 1))
fi
echo ""

# Test 4: Test Roadmap List API
echo -e "${BLUE}Test 4/5: Testing Roadmap List API${NC}"
if curl -s http://localhost:8000/api/roadmap/list > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Roadmap List API is accessible${NC}"
else
    echo -e "${RED}✗ Roadmap List API failed${NC}"
    FAILURES=$((FAILURES + 1))
fi
echo ""

# Test 5: Test Roadmap Generation (optional - takes time)
echo -e "${BLUE}Test 5/5: Testing Roadmap Generation (Optional)${NC}"
read -p "Run roadmap generation test? This takes 30-60s. (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Generating test roadmap..."
    RESPONSE=$(curl -s -X POST http://localhost:8000/api/roadmap/generate \
        -H "Content-Type: application/json" \
        -d '{"query":"Test query"}' \
        --max-time 120)
    
    if echo "$RESPONSE" | grep -q "domains"; then
        echo -e "${GREEN}✓ Roadmap generation successful${NC}"
        
        # Check if file was created
        LATEST_FILE=$(ls -t backend/roadmaps/*_final.json 2>/dev/null | head -1)
        if [ -f "$LATEST_FILE" ]; then
            echo -e "${GREEN}✓ Roadmap file created: $(basename $LATEST_FILE)${NC}"
        fi
    elif echo "$RESPONSE" | grep -q "error\|detail"; then
        echo -e "${RED}✗ Roadmap generation failed${NC}"
        echo "  Response: $RESPONSE" | head -c 200
        FAILURES=$((FAILURES + 1))
    else
        echo -e "${YELLOW}⚠ Unexpected response${NC}"
    fi
else
    echo -e "${YELLOW}⊘ Skipped roadmap generation test${NC}"
fi
echo ""

# Summary
echo "========================================="
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo "========================================="
    echo ""
    echo "🎉 System is fully operational!"
    echo ""
    echo "Quick links:"
    echo "  • App: http://localhost:3000/roadmap"
    echo "  • API: http://localhost:8000/docs"
    echo ""
    echo "Generated roadmaps:"
    if ls backend/roadmaps/*_final.json 1> /dev/null 2>&1; then
        ls -lht backend/roadmaps/*_final.json | head -3
    else
        echo "  No roadmaps generated yet"
    fi
    echo ""
else
    echo -e "${RED}✗ $FAILURES test(s) failed${NC}"
    echo "========================================="
    echo ""
    echo "Please check the errors above and:"
    echo "  • Ensure all services are running: ./start-all.sh"
    echo "  • Check logs: tail -f backend/logs/*.log"
    echo "  • Review setup: ./setup-all.sh"
    echo ""
    exit 1
fi
