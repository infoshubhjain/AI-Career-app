# Backend Documentation

> AI Career App - FastAPI Backend Documentation

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Core Modules](#core-modules)
- [Services](#services)
- [Security](#security)
- [Supabase Integration](#supabase-integration)

---

## Overview

The backend is built with **FastAPI** and integrates with **Supabase** for database, authentication, and storage. It provides a RESTful API for the AI Career App frontend.

### Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.115.6 | Web framework |
| Uvicorn | 0.34.0 | ASGI server |
| Pydantic | 2.10.4 | Data validation |
| Supabase | 2.10.0 | BaaS (Database, Auth) |
| Python-Jose | 3.3.0 | JWT handling |
| Passlib | 1.7.4 | Password hashing |

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py          # Package init
│   ├── main.py              # FastAPI application entry
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py        # Settings & environment
│   │   └── security.py      # Auth utilities
│   ├── api/
│   │   ├── __init__.py
│   │   └── health.py        # Health check routes
│   └── services/
│       └── __init__.py      # Business logic (placeholder)
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables
└── README.md
```

---

## Configuration

### Settings Class

**File:** `app/core/config.py`

Settings are managed via Pydantic's `BaseSettings`, automatically loading from environment variables and `.env` file.

```python
from app.core.config import settings

# Access settings
print(settings.APP_NAME)
print(settings.SUPABASE_URL)
```

### Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `APP_NAME` | str | "AI Career App" | Application name |
| `APP_VERSION` | str | "1.0.0" | Application version |
| `DEBUG` | bool | False | Debug mode |
| `HOST` | str | "0.0.0.0" | Server host |
| `PORT` | int | 8000 | Server port |
| `CORS_ORIGINS` | List[str] | ["http://localhost:3000"] | Allowed origins |
| `SUPABASE_URL` | str | "" | Supabase project URL |
| `SUPABASE_ANON_KEY` | str | "" | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | str | "" | Supabase service key |
| `JWT_SECRET_KEY` | str | - | JWT signing secret |
| `JWT_ALGORITHM` | str | "HS256" | JWT algorithm |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | int | 30 | Token expiry |

### Cached Settings

```python
from app.core.config import get_settings

# Uses lru_cache - reads .env only once
settings = get_settings()
```

---

## API Endpoints

### Root

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API information |

**Response:**
```json
{
  "app": "AI Career App",
  "version": "1.0.0",
  "docs": "/docs",
  "health": "/health"
}
```

---

### Health Check

**File:** `app/api/health.py`

#### Basic Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Basic health check |

**Response Model:**
```python
class HealthResponse(BaseModel):
    status: str        # "healthy" | "unhealthy"
    timestamp: str     # ISO format timestamp
    version: str       # App version
    app_name: str      # App name
```

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-22T10:30:00.000000",
  "version": "1.0.0",
  "app_name": "AI Career App"
}
```

---

#### Detailed Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health/detailed` | Health check with service status |

**Response Model:**
```python
class DetailedHealthResponse(HealthResponse):
    services: dict     # Service connectivity status
```

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-22T10:30:00.000000",
  "version": "1.0.0",
  "app_name": "AI Career App",
  "services": {
    "supabase": {
      "status": "healthy",
      "message": "Credentials configured"
    }
  }
}
```

---

## Core Modules

### config.py

Provides application configuration via environment variables.

**Functions:**

| Function | Returns | Description |
|----------|---------|-------------|
| `get_settings()` | `Settings` | Cached settings instance |

**Usage:**
```python
from app.core.config import settings

# Direct access
api_url = settings.SUPABASE_URL

# Or via function (same result, cached)
from app.core.config import get_settings
settings = get_settings()
```

---

### security.py

Authentication and security utilities.

**Functions:**

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `verify_password` | `plain_password`, `hashed_password` | `bool` | Verify password |
| `hash_password` | `password` | `str` | Hash a password |
| `create_access_token` | `data`, `expires_delta?` | `str` | Create JWT token |
| `decode_access_token` | `token` | `dict \| None` | Decode JWT token |

**Examples:**

```python
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

# Hash a password
hashed = hash_password("mypassword123")

# Verify password
is_valid = verify_password("mypassword123", hashed)  # True

# Create JWT token
token = create_access_token({"sub": "user_id_123"})

# Decode token
payload = decode_access_token(token)
# {"sub": "user_id_123", "exp": 1703234567}
```

---

## Services

**Directory:** `app/services/`

The services module is a placeholder for business logic. As the application grows, add service classes here.

**Recommended Structure:**
```
services/
├── __init__.py
├── supabase.py      # Supabase client initialization
├── user.py          # User-related operations
├── career.py        # Career path operations
└── ai.py            # AI/ML integrations
```

**Example Service Pattern:**
```python
# app/services/user.py
from supabase import Client

class UserService:
    def __init__(self, client: Client):
        self.client = client
    
    async def get_user(self, user_id: str):
        response = self.client.table("users").select("*").eq("id", user_id).execute()
        return response.data[0] if response.data else None
```

---

## Security

### Password Hashing

Uses bcrypt via `passlib`:

```python
from app.core.security import hash_password, verify_password

# Store hashed password
hashed = hash_password("user_password")

# Verify on login
if verify_password(input_password, stored_hash):
    # Password correct
```

### JWT Tokens

Uses `python-jose` for JWT operations:

```python
from datetime import timedelta
from app.core.security import create_access_token, decode_access_token

# Create token with custom expiry
token = create_access_token(
    data={"sub": user_id, "role": "user"},
    expires_delta=timedelta(hours=24)
)

# Decode and validate
payload = decode_access_token(token)
if payload:
    user_id = payload.get("sub")
```

---

## Supabase Integration

### Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Get your credentials from Project Settings → API
3. Add to `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Client Initialization (To Be Implemented)

```python
# app/services/supabase.py
from supabase import create_client, Client
from app.core.config import settings

def get_supabase_client() -> Client:
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY
    )

supabase = get_supabase_client()
```

### Common Operations

```python
# Insert
response = supabase.table("users").insert({"email": "user@example.com"}).execute()

# Select
response = supabase.table("users").select("*").eq("id", user_id).execute()

# Update
response = supabase.table("users").update({"name": "New Name"}).eq("id", user_id).execute()

# Delete
response = supabase.table("users").delete().eq("id", user_id).execute()
```

---

## Running the Server

### Development

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Production

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## API Documentation

When the server is running:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

---

*Last updated: December 2024*


