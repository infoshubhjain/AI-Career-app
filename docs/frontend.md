# Frontend Documentation

## Overview

Next.js 15 application with Supabase authentication. Users sign up/login via email+password, and the JWT token is automatically attached to API requests for FastAPI backend authorization.

---

## Project Structure

```
frontend/
├── app/
│   ├── auth/                    # Authentication pages
│   │   ├── login/page.tsx       # Login page
│   │   ├── signup/page.tsx      # Signup page
│   │   └── callback/page.tsx    # Email verification handler
│   ├── components/
│   │   ├── auth/                # Auth-related components
│   │   │   ├── LoginForm.tsx    # Login form with validation
│   │   │   └── SignupForm.tsx   # Signup form with validation
│   │   └── ui/                  # Reusable UI components
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Input.tsx
│   ├── context/
│   │   └── AuthContext.tsx      # Global auth state provider
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client initialization
│   │   ├── auth.ts              # Auth functions (signUp, signIn, signOut)
│   │   └── api.ts               # API client with JWT attachment
│   ├── layout.tsx               # Root layout with AuthProvider
│   ├── page.tsx                 # Home page
│   ├── globals.css              # Global styles
│   ├── loading.tsx              # Loading state
│   ├── error.tsx                # Error boundary
│   └── not-found.tsx            # 404 page
├── .env.local                   # Environment variables
└── package.json
```

---

## Folder Descriptions

| Folder | Purpose |
|--------|---------|
| `app/auth/` | Authentication flow pages (login, signup, email verification) |
| `app/components/auth/` | Auth form components with validation and error handling |
| `app/components/ui/` | Reusable UI primitives (Button, Card, Input) |
| `app/context/` | React context providers for global state |
| `app/lib/` | Utility modules (Supabase client, auth service, API client) |

---

## Authentication System

### How It Works

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  User        │───▶│  Supabase    │───▶│  Session     │
│  signs up    │    │  Auth API    │    │  created     │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Verification │
                    │ email sent   │
                    └──────────────┘
                           │
                           ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  User clicks │───▶│  /auth/      │───▶│  Redirect to │
│  email link  │    │  callback    │    │  /auth/login │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/supabase.ts` | Initializes Supabase client with env variables |
| `lib/auth.ts` | `signUp()`, `signIn()`, `signOut()`, `getAccessToken()` |
| `lib/api.ts` | Fetch wrapper that attaches JWT to requests |
| `context/AuthContext.tsx` | Provides `useAuth()` hook for components |

### Using Authentication in Components

```typescript
import { useAuth } from "@/app/context/AuthContext";

function MyComponent() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  
  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <LoginPrompt />;
  
  return <div>Welcome, {user.email}</div>;
}
```

### Making Authenticated API Calls

```typescript
import { api } from "@/app/lib/api";

// JWT is automatically attached as Authorization: Bearer <token>
const { data, error } = await api.get("/api/protected-endpoint");
const { data, error } = await api.post("/api/items", { name: "Item" });
```

---

## Supabase Integration

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Users Table in Supabase

Supabase Auth automatically manages users in the `auth.users` table. This table is in a protected schema and contains:

| Column | Description |
|--------|-------------|
| `id` | UUID - unique user identifier |
| `email` | User's email address |
| `created_at` | Account creation timestamp |
| `email_confirmed_at` | When email was verified (null if not verified) |
| `last_sign_in_at` | Last login timestamp |

### Accessing Users in Supabase Dashboard

1. **View Users**: Dashboard → Authentication → Users
2. **User Details**: Click any user to see their metadata
3. **Delete User**: Click user → Delete (in dropdown menu)
4. **Invite User**: Users tab → Invite user button

### Querying Users via SQL Editor

```sql
-- View all users
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users;

-- Find specific user
SELECT * FROM auth.users WHERE email = 'user@example.com';

-- Count users
SELECT COUNT(*) FROM auth.users;
```

### Creating a Custom Users Profile Table

To store additional user data, create a `public.profiles` table:

```sql
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);
```

### Interacting with Users from Your App

```typescript
import { supabase } from "@/app/lib/supabase";

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Get user's profile (if you created profiles table)
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .single();

// Update profile
await supabase
  .from("profiles")
  .update({ full_name: "New Name" })
  .eq("id", user.id);
```

---

## Routes

| Route | Auth Required | Description |
|-------|---------------|-------------|
| `/` | No | Home page, shows auth status |
| `/auth/login` | No | Login form |
| `/auth/signup` | No | Signup form |
| `/auth/callback` | No | Email verification handler |

---

## Running Locally

```bash
cd frontend
npm install
npm run dev
```

Requires `.env.local` with Supabase credentials.

---

## Configuration Checklist

- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- [ ] Add `http://localhost:3000/auth/callback` to Supabase Redirect URLs
- [ ] Enable Email provider in Supabase Authentication settings

