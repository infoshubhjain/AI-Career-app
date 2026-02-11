#!/bin/bash

# AI Career App - Complete Setup and Launch Script
# This script automates the entire setup process

set -e  # Exit on error

echo "🚀 AI Career App - Complete Setup & Launch"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    print_error "Error: frontend directory not found!"
    echo "Please run this script from the AI-Career-app root directory"
    exit 1
fi

print_info "Starting automated setup..."
echo ""

# Step 1: Check for Node.js
print_info "Step 1/5: Checking prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    echo ""
    echo "Please install Node.js (v18 or higher) from:"
    echo "https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
print_success "Node.js $NODE_VERSION is installed"

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed!"
    exit 1
fi

NPM_VERSION=$(npm -v)
print_success "npm $NPM_VERSION is installed"
echo ""

# Step 2: Navigate to frontend and install dependencies
print_info "Step 2/5: Installing dependencies..."
cd frontend

if [ -d "node_modules" ]; then
    print_warning "node_modules already exists, skipping installation"
else
    print_info "Running npm install (this may take a few minutes)..."
    npm install
    print_success "Dependencies installed!"
fi
echo ""

# Step 3: Setup environment variables
print_info "Step 3/5: Setting up environment..."

ENV_FILE=".env.local"
ENV_EXAMPLE=".env.example"

# Create .env.example if it doesn't exist
if [ ! -f "$ENV_EXAMPLE" ]; then
    cat > "$ENV_EXAMPLE" << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key
EOF
    print_success "Created .env.example template"
fi

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
    print_warning ".env.local not found - creating from template..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    print_success "Created .env.local file"
    echo ""
    
    print_warning "IMPORTANT: You need to add your API credentials!"
    echo ""
    echo "Please update the following in frontend/.env.local:"
    echo "  1. NEXT_PUBLIC_SUPABASE_URL - Get from https://supabase.com"
    echo "  2. NEXT_PUBLIC_SUPABASE_ANON_KEY - From your Supabase project settings"
    echo "  3. GOOGLE_GENERATIVE_AI_API_KEY - Get from https://makersuite.google.com/app/apikey"
    echo ""
    
    read -p "Do you want to open .env.local now to add your keys? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v code &> /dev/null; then
            code "$ENV_FILE"
            print_info "Opening in VS Code..."
        elif command -v nano &> /dev/null; then
            nano "$ENV_FILE"
        else
            print_info "Please edit frontend/.env.local manually"
        fi
        echo ""
        read -p "Press Enter when you've added your API keys to continue..."
    fi
else
    print_success ".env.local already exists"
    
    # Check if keys are still placeholders
    if grep -q "your_supabase" "$ENV_FILE" || grep -q "your_google" "$ENV_FILE"; then
        print_warning "Some API keys appear to be placeholder values"
        echo ""
        read -p "Do you want to update your API keys now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if command -v code &> /dev/null; then
                code "$ENV_FILE"
            elif command -v nano &> /dev/null; then
                nano "$ENV_FILE"
            else
                print_info "Please edit frontend/.env.local manually"
            fi
            echo ""
            read -p "Press Enter when you've updated your API keys to continue..."
        fi
    else
        print_success "API keys are configured"
    fi
fi
echo ""

# Step 4: Verify setup
print_info "Step 4/5: Verifying setup..."

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found!"
    exit 1
fi
print_success "package.json found"

# Check if next.config.mjs exists
if [ -f "next.config.mjs" ] || [ -f "next.config.js" ]; then
    print_success "Next.js configuration found"
else
    print_warning "Next.js configuration not found (may be default)"
fi

echo ""

# Step 5: Launch the app
print_info "Step 5/5: Launching development server..."
echo ""
print_success "Setup complete! 🎉"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "Starting Next.js development server..."
print_info "The app will be available at: ${GREEN}http://localhost:3000${NC}"
echo ""
echo "Press ${YELLOW}Ctrl+C${NC} to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Give user a moment to read
sleep 2

# Start the dev server
npm run dev
