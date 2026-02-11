# AI Career Tutor 🚀

> **People don’t fail because they lack information. They fail because the information is overwhelming.**

AI Career Tutor is a personalized, task-first career mentor designed to simplify the path to your dream job. Instead of dumping a giant, overwhelming roadmap, it reveals only the **next micro-step**, helping you stay focused and achieve consistent progress.

---

## ✨ The Vision

Traditional roadmaps create paralysis. AI Career Tutor turns the roadmap into a conversation:

- **100-step plan, 1 step visible**: We build the entire roadmap behind the scenes but only surface what you need to do *right now*.
- **Dynamic Adaptation**: The AI gauges your level through chat and quizzes, adjusting the roadmap as you learn.
- **Personal Career Coach**: Not just a checklist, but an active mentor that asks questions, validates your knowledge, and keeps you engaged.
- **Gamified Progress**: XP, streaks, and badges to turn career building into an addictive journey.

---

## 🏗️ How It Works

The system is built on a modern, scalable architecture:

1.  **Skill Representation Layer**: A dynamic knowledge graph that tracks prerequisites and dependencies.
2.  **Learner Model**: A probabilistic estimate of your mastery over each skill node.
3.  **Assessment Engine**: AI-generated quizzes and challenges that produce real signals of competence.
4.  **Recommendation Engine**: An LLM-powered tutor that chooses the highest-leverage next micro-task based on your current level.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 18, Tailwind CSS, Lucide Icons.
- **Backend**: Supabase (PostgreSQL, Auth, RLS).
- **Authentication**: Google OAuth via Supabase.
- **AI Integration**: Custom API routes layer supporting OpenAI, Gemini, or local models.
- **State Management**: Zustand & React Context.

---

## 🚀 Quick Start (One Command!)

### Mac/Linux
```bash
./setup-and-launch.sh
```

### Windows
```bash
setup-and-launch.bat
```
Or just double-click `setup-and-launch.bat`

**That's it!** The script will:
- ✅ Check for Node.js/npm
- ✅ Install all dependencies
- ✅ Set up environment files
- ✅ Launch the development server

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📋 Manual Setup (If Needed)

### Prerequisites

- Node.js 18+
- A Supabase project

### Installation

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up your environment variables in `.env.local`:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
    GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key
    ```
4.  Run the development server:
    ```bash
    npm run dev
    ```

### Database Setup

Run the initial schema migration in your Supabase SQL editor located at `/supabase/schema.sql`.


---

## 📈 Current Status & Roadmap

### ✅ Implemented
- [x] Modern Landing Page for goal setting.
- [x] Chat interface with real-time feedback.
- [x] Supabase & Google OAuth integration.
- [x] AI Prompting framework for career coaching.
- [x] Dynamic navigation from goal to tutor.

### 🚧 In Progress
- [ ] Live LLM integration (OpenAI/Gemini).
- [ ] Dynamic roadmap generation & visualization.
- [ ] AI-powered skill assessments (quizzes).
- [ ] Progress tracking & XP system.

---

## 👥 Target Users
- Students picking careers.
- Self-taught coders.
- Professionals switching fields into Tech, AI, or Finance.
- Anyone feeling lost in the sea of online information.

---

## 🔮 The Magic Feature: "Personal Career Mode"
Every time you chat, the AI updates your strengths, weaknesses, and skill gaps behind the scenes. It’s not just a chat; it’s a continuous, evolving career coaching session that remembers your history and milestones.
