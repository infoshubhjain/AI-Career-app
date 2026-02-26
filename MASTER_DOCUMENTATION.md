# AI Career App - Master Documentation

## Overview
The AI Career App is a comprehensive platform designed to provide personalized career guidance. It features an AI-powered chat interface that interacts with users to understand their goals and experience levels, and a backend AI agent that generates detailed, 100-step career roadmaps based on this information. 

The application utilizes a modern tech stack with a Next.js frontend, a FastAPI Python backend, and Supabase for authentication and database management. The core AI functionality is powered by Large Language Models (LLMs), configurable to use providers like Google AI (Gemini) or OpenAI.

## Tech Stack & Architecture

### Frontend (Next.js)
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (`app/globals.css`, `index.css`) with a custom design system featuring glassmorphism, smooth animations, and a polished dark mode.
- **State Management**: React Context (`contexts/auth-context.tsx`)
- **AI Integration**: Vercel AI SDK (`@ai-sdk/react`, `@ai-sdk/google`) for streaming chat interfaces.

#### Key Routes & Components
- `/` (Landing Page): Introduction to the app with animated UI elements.
- `/auth/login`, `/auth/signup`: User authentication flows.
- `/chat`: The core AI chat interface where users interact with the career coach.
- `/roadmap`: Visualization of the generated 100-step career roadmap.

### Backend (FastAPI Python)
- **Framework**: FastAPI
- **Language**: Python 3.x
- **Configuration**: Pydantic `BaseSettings` (`app/core/config.py`) and YAML (`config.yaml`).
- **AI Agent Pipeline**: A multi-stage pipeline (`agents/roadmap/`) that first generates high-level domains and then subdomains/skills for the roadmap.

#### API Endpoints
- `GET /health` & `GET /api/health`: Health check endpoints verifying service connectivity (e.g., Supabase).
- `POST /api/roadmap/generate`: The endpoint that receives frontend requests to generate a roadmap. It triggers the backend `RoadmapAgent` pipeline.
- Authentication and User endpoints (`/users/me`, `/users/check`) for session validation using Supabase JWTs.

### Database & Authentication (Supabase)
- **Authentication**: Google OAuth provider configured via Supabase.
- **Database**: PostgreSQL (managed by Supabase).
- **Security**: Row Level Security (RLS) ensures users only access their own data.

#### Key Tables
- `profiles`: User profile data, XP, and streaks.
- `roadmaps`: Stores generated roadmaps as JSON structures (`full_roadmap`).
- `messages`: Persists the chat history between the user and the AI.

## Project Setup & Installation

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- Supabase Project
- Generative AI API Key (Google AI or OpenAI)

### 1. Supabase Initialization
1. Create a project at [supabase.com](https://supabase.com/).
2. Run the SQL script located in `supabase/schema.sql` (Note: ensure this exists or use the UI to recreate tables: `profiles`, `roadmaps`, `messages`, `quiz_results`).
3. Enable Google OAuth in Authentication Providers and configure the Redirect URIs to match your frontend (e.g., `http://localhost:3000/auth/callback`).

### 2. Backend Setup
1. Navigate to the `backend` directory.
2. Create and activate a virtual environment: `python3 -m venv venv && source venv/bin/activate`.
3. Install dependencies: `pip install -r requirements.txt`.
4. Create a `.env` file (see Environment Variables section below).
5. Start the server: `python -m uvicorn app.main:app --reload` (Runs on `http://localhost:8000`).

### 3. Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`.
3. Create a `.env.local` file (see Environment Variables section below).
4. Start the development server: `npm run dev` (Runs on `http://localhost:3000`).

## Environment Variables

### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_API_URL`: URL of the Python backend (e.g., `http://localhost:8000`).
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
- `GOOGLE_GENERATIVE_AI_API_KEY`: API Key for Google Gemini (Used for the Vercel AI SDK chat interface).
- *(Optional)* `NEXT_PUBLIC_MOCK_AI`: Set to `true` to disable real AI calls for testing UI.

### Backend (`backend/.env`)
- `APP_NAME`, `APP_VERSION`, `DEBUG`: Application metadata and toggle.
- `HOST`, `PORT`: Server binding configuration.
- `CORS_ORIGINS`: Allowed origins (e.g., `["http://localhost:3000"]`).
- `SUPABASE_URL`: Your Supabase Project URL.
- `SUPABASE_ANON_KEY`: Your Supabase Anon Key.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (Requires elevated privileges).
- `SUPABASE_JWT_SECRET`: Signing secret for Supabase Auth JWTs.
- `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`: JWT Configuration for backend auth checking.
- `OPENAI_API_KEY`: API key if OpenAI is selected as the provider in `config.yaml`.
- `GOOGLE_API_KEY`: API key if Google AI is selected as the provider in `config.yaml`.

## AI Agent Workflows

### Chat Interface Workflow
The frontend utilizes the Vercel AI SDK to stream responses from a language model (typically Gemini). The model is prompted with a `systemPrompt` (found in `frontend/lib/ai/prompts.ts`) to act as a career coach. The chat is equipped with a `generateRoadmap` tool. When the AI determines enough information has been gathered (goal and level), it invokes this tool.

### Roadmap Generation Pipeline (Backend)
When the frontend `generateRoadmap` tool is called, it makes a POST request to the backend `/api/roadmap/generate`. The backend `RoadmapAgent` executes a multi-stage pipeline:
1.  **Domain Generation**: Takes the user's goal and level and outputs 6-12 high-level domains chronologically.
2.  **Skill Generation**: For each generated domain, it outputs roughly 8 specific skills or subdomains.

The backend relies on `config.yaml` to determine which LLM provider (e.g., `openai`, `google`) and model to use for this generation. It features retry logic and fallback behavior to ensure a valid roadmap is produced. The combined structure is returned to the frontend.

### Frontend Integration
The frontend `roadmap-service.ts` converts the backend's `domains/subdomains` structure into a `phases/steps` structure containing 100 individual steps. This flattened structure is then saved directly to the Supabase `roadmaps` table and displayed to the user via the `RoadmapCreated` UI component in the chat.
