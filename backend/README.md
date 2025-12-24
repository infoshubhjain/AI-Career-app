# AI Career App - Backend

FastAPI backend for the AI Career App with Supabase integration.

## Tech Stack

- **FastAPI** - Modern Python web framework
- **Supabase** - Backend-as-a-Service (PostgreSQL, Auth, Storage)
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

## Quick Start

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Copy `.env` and fill in your Supabase credentials:

```bash
# Edit .env with your Supabase project details
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run Development Server

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Project Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI application entry point
│   ├── core/
│   │   ├── config.py     # Application settings
│   │   └── security.py   # Auth & security utilities
│   ├── api/
│   │   └── health.py     # Health check endpoints
│   └── services/
│       └── __init__.py   # Business logic services
├── requirements.txt      # Python dependencies
├── .env                  # Environment variables
└── README.md
```

## Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info |
| GET | `/health` | Basic health check |
| GET | `/health/detailed` | Detailed health with service status |
| GET | `/docs` | Swagger documentation |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_NAME` | Application name | AI Career App |
| `APP_VERSION` | Application version | 1.0.0 |
| `DEBUG` | Debug mode | false |
| `HOST` | Server host | 0.0.0.0 |
| `PORT` | Server port | 8000 |
| `CORS_ORIGINS` | Allowed CORS origins | ["http://localhost:3000"] |
| `SUPABASE_URL` | Supabase project URL | - |
| `SUPABASE_ANON_KEY` | Supabase anon/public key | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | - |
| `JWT_SECRET_KEY` | Secret for JWT signing | - |

## Development

### Running Tests

```bash
pytest
```

### Code Formatting

```bash
# Install dev dependencies
pip install black isort

# Format code
black app/
isort app/
```


