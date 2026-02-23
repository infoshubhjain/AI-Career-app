#!/bin/bash

# Setup and verify Ollama installation
# This script checks if Ollama is installed and pulls the required model

set -e  # Exit on error

echo "========================================="
echo "🤖 Ollama Setup Script"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

MODEL="qwen2.5:3b"

# Check if Ollama is installed
echo "Checking Ollama installation..."
if ! command -v ollama &> /dev/null; then
    echo -e "${RED}✗ Ollama is not installed${NC}"
    echo ""
    echo "Please install Ollama:"
    echo "  • macOS: brew install ollama"
    echo "  • Or download from: https://ollama.ai"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Ollama is installed${NC}"
echo ""

# Check if Ollama service is running
echo "Checking Ollama service..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Ollama service is not running${NC}"
    echo "Starting Ollama service..."
    
    # Try to start Ollama in the background
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "Starting Ollama daemon..."
        ollama serve > /dev/null 2>&1 &
        sleep 3
    else
        # Linux
        echo "Starting Ollama daemon..."
        ollama serve > /dev/null 2>&1 &
        sleep 3
    fi
    
    # Verify it started
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Ollama service started${NC}"
    else
        echo -e "${RED}✗ Failed to start Ollama service${NC}"
        echo "Please start it manually: ollama serve"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Ollama service is running${NC}"
fi
echo ""

# Check if model is installed
echo "Checking for model: $MODEL"
if ollama list | grep -q "$MODEL"; then
    echo -e "${GREEN}✓ Model $MODEL is already installed${NC}"
else
    echo -e "${YELLOW}⚠ Model $MODEL not found${NC}"
    echo "Pulling model (this may take a few minutes)..."
    
    if ollama pull "$MODEL"; then
        echo -e "${GREEN}✓ Successfully pulled model $MODEL${NC}"
    else
        echo -e "${RED}✗ Failed to pull model${NC}"
        exit 1
    fi
fi
echo ""

# Test the model
echo "Testing model..."
if echo "Hello" | ollama run "$MODEL" --silent > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Model is working correctly${NC}"
else
    echo -e "${YELLOW}⚠ Model test had issues (this might be okay)${NC}"
fi
echo ""

echo "========================================="
echo -e "${GREEN}✓ Ollama setup complete!${NC}"
echo "========================================="
echo ""
echo "Installed models:"
ollama list
echo ""
