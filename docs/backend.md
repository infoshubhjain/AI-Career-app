# Backend Documentation

## Overview

FastAPI backend that verifies Supabase JWTs from the frontend. It does not handle login/signup (that's done by Supabase on the frontend) - it only validates tokens and protects API endpoints.

---

## Project Structure

```
backend/
├── app/
│   ├── api/                     # API route handlers
│   │   ├── health.py            # Health check endpoints
│   │   └── users.py             # Protected user endpoints
│   ├── core/                    # Core utilities
│   │   ├── config.py            # Environment configuration
│   │   ├── auth.py              # JWT verification & dependencies
│   │   └── security.py          # Password hashing (if needed)
│   ├── services/                # Business logic (placeholder)
│   └── main.py                  # FastAPI application entry
├── .env                         # Environment variables
├── .env.example                 # Environment template
└── requirements.txt             # Python dependencies
```

---

## Folder Descriptions

| Folder | Purpose |
|--------|---------|
| `app/api/` | HTTP route handlers (endpoints) |
| `app/core/` | Configuration, authentication, security utilities |
| `app/services/` | Business logic and external integrations (placeholder) |

---

## Authentication System

### How It Works

```
Frontend                          Backend
────────                          ───────
User logs in via Supabase    
         │
         ▼
JWT stored in session        
         │
         ▼
API request with header:     ───▶  Extract token from
Authorization: Bearer <JWT>        Authorization header
                                          │
                                          ▼
                                   Verify JWT using
                                   SUPABASE_JWT_SECRET
                                          │
                                          ▼
                                   Extract user_id, email
                                   from token payload
                                          │
                                          ▼
                                   Process request with
                                   user context
```

### Tangible Use Cases

| Use Case | How It Works |
|----------|--------------|
| **Personalized Data** | Use `user.id` to fetch/store user-specific data |
| **User Profiles** | Create a `profiles` table linked to `user.id` |
| **Authorization** | Check user role/permissions before actions |
| **Audit Logging** | Log who performed what action |
| **Rate Limiting** | Apply per-user rate limits |

### Example: Storing User-Specific Data

```python
from app.core.auth import get_current_user, CurrentUser

@router.post("/career-goals")
async def save_career_goal(
    goal: str,
    user: CurrentUser = Depends(get_current_user)
):
    # user.id is the Supabase user UUID
    # Save goal to database with user.id as foreign key
    await db.execute(
        "INSERT INTO career_goals (user_id, goal) VALUES ($1, $2)",
        user.id, goal
    )
    return {"status": "saved"}
```

---

## Key Files

### `core/auth.py` - Authentication

| Function | Purpose |
|----------|---------|
| `verify_supabase_token(token)` | Decode and validate JWT |
| `get_current_user` | Dependency for protected routes (401 if invalid) |
| `get_optional_user` | Dependency for optional auth (returns None if no token) |

### `core/config.py` - Configuration

Loads settings from environment variables:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_JWT_SECRET` | **Required for auth** - JWT signing secret |
| `CORS_ORIGINS` | Allowed frontend URLs |

---

## API Endpoints

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API info |
| GET | `/health` | Basic health check |
| GET | `/health/detailed` | Detailed health with services |
| GET | `/users/check` | Check auth status (works without token) |

### Protected Endpoints (Require JWT)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Get current user's profile |

---

## Creating Protected Endpoints

```python
from fastapi import APIRouter, Depends
from app.core.auth import get_current_user, CurrentUser

router = APIRouter()

# Requires valid JWT - returns 401 if missing/invalid
@router.get("/protected")
async def protected_route(user: CurrentUser = Depends(get_current_user)):
    return {
        "user_id": user.id,
        "email": user.email
    }

# Optional auth - works with or without token
@router.get("/public")
async def public_route(user: CurrentUser | None = Depends(get_optional_user)):
    if user:
        return {"message": f"Hello, {user.email}"}
    return {"message": "Hello, guest"}
```

---

## Environment Setup

### Required API Key

You need to add **one new key** to your backend `.env`:

```env
SUPABASE_JWT_SECRET=your-jwt-secret-here
```

**Where to find it:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **JWT Secret** (under "JWT Settings")

### Full `.env` Example

```env
# Application
APP_NAME="AI Career App"
DEBUG=true

# CORS
CORS_ORIGINS=["http://localhost:3000"]

# Supabase (from Dashboard → Settings → API)
SUPABASE_URL=https://ghigujejhlfsxpavvjvg.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=your-jwt-secret-here
```

---

## Testing the Auth Flow

### 1. Start the backend
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### 2. Test without token (should fail)
```bash
curl http://localhost:8000/users/me
# Returns: 403 Forbidden (no credentials)
```

### 3. Test with token from frontend
After logging in on the frontend, the JWT is automatically attached.
Or manually test:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:8000/users/me
# Returns: {"id": "uuid", "email": "user@example.com", "message": "..."}
```

### 4. Check auth status (works either way)
```bash
curl http://localhost:8000/users/check
# Returns: {"authenticated": false, ...}

curl -H "Authorization: Bearer TOKEN" http://localhost:8000/users/check
# Returns: {"authenticated": true, "user_id": "...", "email": "..."}
```

---

## Running the Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

API docs available at: http://localhost:8000/docs

---

## Configuration Checklist

- [ ] Set `SUPABASE_JWT_SECRET` in `.env`
- [ ] Set `SUPABASE_URL` in `.env`  
- [ ] Set `CORS_ORIGINS` to include your frontend URL
- [ ] Install dependencies: `pip install -r requirements.txt`
