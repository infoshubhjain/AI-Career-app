#!/bin/bash

# AI Career App - Launch Script
# This script helps you launch the development server after setting up the environment

echo "🚀 AI Career App - Launch Script"
echo "=================================="
echo ""

# Navigate to frontend directory
cd frontend || { echo "❌ Error: frontend directory not found!"; exit 1; }

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed!"
    echo ""
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  WARNING: .env.local file not found!"
    echo "The app may not function correctly without API keys."
    echo "To set up keys, edit frontend/.env.local"
    echo ""
fi

echo "🔧 Starting development server..."
echo "The app will be available at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm run dev
