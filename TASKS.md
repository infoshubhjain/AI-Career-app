# AI Career Tutor - Project Roadmap & Task Breakdown

This document provides a granular breakdown of the phases and tasks required to complete the AI Career Tutor application.

## 🏁 Phase 1: Foundation & Documentation (COMPLETED)
- [x] **Project Scaffolding**: Initialize Next.js with Tailwind CSS and TypeScript.
- [x] **Documentation**: Create Vision & Scope, System Flow, and Agent Behavior documents.
- [x] **Landing Page**: Build a minimal, centered entry point for career goal definition.
- [x] **Task Tracking**: Set up initial internal task checklist.

## 🔐 Phase 2: Database & Auth Setup (COMPLETED)
- [x] **Dependency Installation**: Install `@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`, `zustand`.
- [x] **Supabase Configuration**: Set up client, server, and middleware utilities.
- [x] **Authentication**:
  - [x] Implement Google OAuth flow.
  - [x] Create `AuthContext` for global session management.
  - [x] Build OAuth callback route.
  - [x] Wrap application in `AuthProvider`.
- [x] **Database Schema**:
  - [x] `profiles` table for user data and XP.
  - [x] `roadmaps` table for storing AI-generated JSON plans.
  - [x] `messages` table for chat history persistence.
  - [x] `quiz_results` table for skill assessment tracking.
  - [x] Enable Row Level Security (RLS) policies.

## 💬 Phase 3: Chat UI & Core Experience (COMPLETED)
- [x] **Chat Page**: Create the main `/chat` route with a responsive layout.
- [x] **UI Components**:
  - [x] Message bubbles (User vs Assistant).
  - [x] Loading/Typing indicators.
  - [x] Goal initiation logic from landing page.
- [x] **State Management**: implement message threading and local state for chat.
- [x] **Navigation**: Connect landing page to chat with seamless goal passing.

## 🧠 Phase 4: AI Integration & Roadmap Generation (IN PROGRESS)
- [/] **AI Service Layer**:
  - [ ] Integrate Vercel AI SDK or direct provider SDK (OpenAI/Gemini).
  - [ ] Implement streaming responses in `/api/chat`.
  - [ ] Handle tool calling for roadmap generation.
- [ ] **System Prompting**:
  - [x] Define "Career Coach" personas and behavior rules.
  - [x] Create structured JSON templates for roadmap data.
- [ ] **Roadmap Logic**:
  - [ ] Implement behind-the-scenes 100-step generation.
  - [ ] Build logic to "reveal" one micro-step at a time.
  - [ ] Persist roadmap state in Supabase.
- [ ] **Conversation Memory**:
  - [ ] Fetch/Store message history in Supabase for persistence across sessions.
  - [ ] Summarize long conversations to preserve context window.

## 📝 Phase 5: Skill Assessment & Quizzes
- [ ] **Quiz Engine**:
  - [ ] Create AI prompt for generating 3-question "checkpoint" quizzes.
  - [ ] Build flexible Quiz component (Multiple Choice, True/False, Explanation).
- [ ] **Skill Graph Verification**:
  - [ ] Implement logic to gauge user competence based on quiz performance.
  - [ ] Use "Explain it to me" tasks for qualitative assessment.
- [ ] **Dynamic Roadmapping**:
  - [ ] Adjust roadmap complexity based on assessment signals (Fail -> break down / Pass -> skip ahead).

## 🎮 Phase 6: Progress & Gamification
- [ ] **Progression System**:
  - [ ] XP calculation logic (messages sent, quizzes passed, milestones reached).
  - [ ] Level-up system (User levels 1-50).
- [ ] **Engagement Features**:
  - [ ] Streak counter (consecutive days of learning).
  - [ ] Badge system (e.g., "Fast Learner", "Problem Solver").
- [ ] **Visualization**:
  - [ ] Progress bar showing distance to the next milestone.
  - [ ] "Career Summary" dashboard showing strengths and weaknesses.

## 💅 Phase 7: Polish, Verification & Deployment
- [ ] **UI/UX Refinement**:
  - [ ] Add smooth transitions between roadmap steps.
  - [ ] Implement "Glassmorphism" and dark mode enhancements.
  - [ ] Add micro-animations for button clicks and accomplishments.
- [ ] **Verification**:
  - [ ] Unit tests for XP calculation and roadmap adjustment logic.
  - [ ] Integration tests for Supabase Auth and Database flows.
  - [ ] End-to-end testing of the full user journey.
- [ ] **Deployment**:
  - [ ] Configure production environment on Vercel or similar.
  - [ ] Finalize SEO metadata and social sharing cards.

  -jdjdjdj
