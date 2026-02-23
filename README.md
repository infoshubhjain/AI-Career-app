# AI Career App

A modern career guidance application built with Next.js, React, and Tailwind CSS. The app helps users define their career goals and provides personalized learning paths based on AI-powered recommendations.

## Landing Page

The entry point features a minimal, centered landing page where users can define what they want to become or what skill they want to learn.

## Features

- **AI-Powered Roadmap Generator** - Two-step multi-agent system for personalized learning paths
- **Fully responsive** - Works seamlessly on mobile and desktop
- **Modern design** - Clean, neutral aesthetic with dark mode support
- **Accessible** - Semantic HTML with proper ARIA labels
- **Type-safe** - Built with TypeScript
- **Fast** - Optimized with Next.js App Router
- **Local LLM Support** - Uses Ollama for privacy-first AI generation

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 3** - Utility-first CSS framework

### Backend
- **FastAPI** - Modern Python web framework
- **Pydantic** - Data validation with type hints
- **Ollama** - Local LLM runner (qwen2.5:3b)
- **Supabase** - Authentication and database

## Getting Started

### Prerequisites

- Node.js 18+ installed on your machine
- Python 3.11+ for backend
- Ollama for local LLM (https://ollama.ai)
- npm, yarn, or pnpm package manager

### ⚡ Quick Start (Recommended)

**One-Command Setup:**

```bash
./setup-all.sh    # First time setup (5-10 min)
./start-all.sh    # Start all services
./test-system.sh  # Verify everything works
```

Visit: **http://localhost:3000/roadmap**

That's it! 🎉

### 📜 Available Scripts

We provide comprehensive shell scripts to streamline your workflow:

**Setup Scripts:**
- `./check-python.sh` - Check Python versions (diagnostic)
- `./setup-all.sh` - Complete setup (recommended)
- `./setup-ollama.sh` - Setup Ollama + AI model
- `./setup-backend.sh` - Setup Python backend
- `./setup-frontend.sh` - Setup Node.js frontend

**Start/Stop Scripts:**
- `./start-all.sh` - Start all services (with tmux split-pane)
- `./start-backend.sh` - Start backend only
- `./start-frontend.sh` - Start frontend only
- `./stop-all.sh` - Stop all services

**Test Script:**
- `./test-system.sh` - Verify system health

📖 **Detailed Guide**: [SCRIPTS_README.md](SCRIPTS_README.md)  
🔄 **Workflows**: [WORKFLOW.md](WORKFLOW.md)

### 📝 Manual Setup

If you prefer manual setup, see: [docs/roadmap-setup.md](docs/roadmap-setup.md)

### Installation

1. Navigate to the project directory:
```bash
cd AI-Career-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the landing page.

### Building for Production

```bash
npm run build
npm run start
# or
yarn build
yarn start
# or
pnpm build
pnpm start
```

## Project Structure

```
AI-Career-app/
├── backend/                # FastAPI backend
│   ├── app/
│   │   ├── api/           # API endpoints
│   │   │   ├── roadmap.py # Roadmap generation endpoints
│   │   │   ├── users.py   # User management
│   │   │   └── health.py  # Health check
│   │   ├── services/      # Business logic
│   │   │   ├── llm.py     # LLM abstraction layer
│   │   │   └── agents.py  # Two-step agent pipeline
│   │   ├── models/        # Pydantic schemas
│   │   ├── core/          # Config and utilities
│   │   └── main.py        # FastAPI app
│   ├── roadmaps/          # Generated roadmap JSON files
│   ├── logs/              # Structured logs
│   └── requirements.txt   # Python dependencies
├── frontend/              # Next.js frontend
│   ├── app/
│   │   ├── roadmap/       # Roadmap generator page
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities (API client, auth)
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Landing page
│   └── package.json       # Node dependencies
├── docs/                  # Documentation
│   ├── roadmap.md         # Roadmap system docs
│   └── roadmap-setup.md   # Setup guide
└── README.md              # This file
```

## Customization

### Changing Colors

Edit [tailwind.config.ts](tailwind.config.ts) to customize the color palette or modify CSS variables in [app/globals.css](app/globals.css).

### Modifying Content

Edit [app/page.tsx](app/page.tsx) to change:
- Headline text
- Placeholder examples
- Button text
- Form behavior

### Adding Functionality

The `handleSubmit` function in [app/page.tsx](app/page.tsx) currently logs to console and shows an alert. Extend it to:
- Navigate to a new page using Next.js router
- Send data to an API endpoint
- Store in state management (Redux, Zustand, etc.)
- Save to local storage

## Design Decisions

- **System fonts** - Using native font stack for optimal performance
- **Minimal Tailwind** - Only essential utilities, no custom plugins
- **No external dependencies** - No UI component libraries
- **Semantic HTML** - Proper use of main, form, h1, p tags
- **Focus states** - Clear visual feedback for keyboard navigation
- **High contrast** - WCAG AA compliant color combinations

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## AI Roadmap Generator

The app now features a two-step multi-agent AI system for generating personalized learning roadmaps:

### How It Works

1. **Agent 1: Domain Generator** - Analyzes your query and generates high-level learning domains
2. **Agent 2: Subdomain Generator** - Expands each domain with specific, actionable skills

### Features

- **Local LLM** - Uses Ollama (qwen2.5:3b) for privacy-first generation
- **Structured Output** - JSON schemas with validation
- **Hierarchical Display** - Beautiful UI showing domains → subdomains
- **Progress Tracking** - All roadmaps saved and accessible
- **Comprehensive Logging** - JSON logs for debugging and analysis

### Documentation

- **Setup Guide**: [docs/roadmap-setup.md](docs/roadmap-setup.md)
- **Full Documentation**: [docs/roadmap.md](docs/roadmap.md)
- **API Docs**: http://localhost:8000/docs (when backend is running)

### Example Queries

- "How to become a data scientist"
- "Learn web development"
- "Master machine learning"
- "Become a DevOps engineer"

## Future Extensions

Planned enhancements:

- More agent types (validation, resource suggestions, prerequisites)
- OpenRouter integration for cloud LLMs
- User authentication and saved roadmaps
- Interactive progress tracking
- Resource links and time estimates
- Customization by difficulty level
- Multi-step onboarding flow
- Community features and mentorship
