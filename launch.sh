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
    echo ""
    echo "Please create a .env.local file with the following variables:"
    echo "  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url"
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key"
    echo "  GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key"
    echo ""
    echo "See launch_guide.md in the artifacts folder for detailed setup instructions."
    echo ""
    read -p "Press Enter to continue without .env.local (app may not work) or Ctrl+C to exit..."
fi

echo "🔧 Starting development server..."
echo "The app will be available at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm run dev
