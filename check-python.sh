#!/bin/bash

# Check available Python versions on the system

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "🐍 Python Version Checker"
echo "========================================="
echo ""

echo "Searching for Python installations..."
echo ""

FOUND_SUITABLE=false

# Check for specific Python versions
for cmd in python3.13 python3.12 python3.11 python3.10 python3.9 python3 python; do
    if command -v "$cmd" &> /dev/null; then
        VERSION=$($cmd --version 2>&1 | awk '{print $2}')
        PATH_LOC=$(which $cmd)
        MAJOR=$(echo $VERSION | cut -d. -f1)
        MINOR=$(echo $VERSION | cut -d. -f2)
        
        # Check if version meets requirements (3.11+)
        if [ "$MAJOR" -eq 3 ] && [ "$MINOR" -ge 11 ]; then
            echo -e "${GREEN}✓ $cmd${NC}"
            echo "  Version: $VERSION"
            echo "  Location: $PATH_LOC"
            echo -e "  Status: ${GREEN}Compatible (3.11+)${NC}"
            FOUND_SUITABLE=true
        elif [ "$MAJOR" -gt 3 ]; then
            echo -e "${GREEN}✓ $cmd${NC}"
            echo "  Version: $VERSION"
            echo "  Location: $PATH_LOC"
            echo -e "  Status: ${GREEN}Compatible${NC}"
            FOUND_SUITABLE=true
        else
            echo -e "${YELLOW}⚠ $cmd${NC}"
            echo "  Version: $VERSION"
            echo "  Location: $PATH_LOC"
            echo -e "  Status: ${RED}Too old (need 3.11+)${NC}"
        fi
        echo ""
    fi
done

# Check if venv exists and what Python it uses
if [ -d "backend/venv" ]; then
    echo -e "${BLUE}Virtual Environment:${NC}"
    if [ -f "backend/venv/bin/python" ]; then
        VENV_VERSION=$(backend/venv/bin/python --version 2>&1 | awk '{print $2}')
        VENV_PATH=$(backend/venv/bin/python -c "import sys; print(sys.executable)")
        echo "  Version: $VENV_VERSION"
        echo "  Location: $VENV_PATH"
        
        VENV_MAJOR=$(echo $VENV_VERSION | cut -d. -f1)
        VENV_MINOR=$(echo $VENV_VERSION | cut -d. -f2)
        
        if [ "$VENV_MAJOR" -eq 3 ] && [ "$VENV_MINOR" -ge 11 ]; then
            echo -e "  Status: ${GREEN}Compatible (3.11+)${NC}"
        else
            echo -e "  Status: ${RED}Too old (need 3.11+)${NC}"
            echo -e "  ${YELLOW}Run: ./setup-backend.sh to recreate venv${NC}"
        fi
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ No virtual environment found${NC}"
    echo "  Run: ./setup-backend.sh"
    echo ""
fi

echo "========================================="
if [ "$FOUND_SUITABLE" = true ]; then
    echo -e "${GREEN}✓ Found compatible Python version(s)${NC}"
    echo "========================================="
    echo ""
    echo "You can proceed with setup:"
    echo "  ./setup-backend.sh"
else
    echo -e "${RED}✗ No compatible Python version found${NC}"
    echo "========================================="
    echo ""
    echo "Python 3.11 or higher is required."
    echo ""
    echo "Installation options:"
    echo ""
    echo "macOS (using Homebrew):"
    echo "  brew install python@3.12"
    echo "  brew link python@3.12"
    echo ""
    echo "macOS (using official installer):"
    echo "  Visit: https://www.python.org/downloads/"
    echo ""
    echo "Ubuntu/Debian:"
    echo "  sudo apt update"
    echo "  sudo apt install python3.12 python3.12-venv"
    echo ""
    echo "After installing, run this script again to verify."
fi
echo ""
