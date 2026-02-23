# Roadmap Generator - Setup Guide

## Prerequisites

1. **Ollama** (for local LLM)
   - Download from: https://ollama.ai
   - Or install via brew: `brew install ollama`

2. **Python 3.11+** (backend)

3. **Node.js 18+** (frontend)

## Quick Start

### 1. Install Ollama and Pull Model

```bash
# Install Ollama (if not already installed)
# Visit https://ollama.ai or use brew
brew install ollama

# Pull the model
ollama pull qwen2.5:3b

# Verify installation
ollama list
```

### 2. Setup Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from .env.example)
# Add these LLM configuration lines:
echo "LLM_PROVIDER=ollama" >> .env
echo "OLLAMA_BASE_URL=http://localhost:11434" >> .env
echo "OLLAMA_MODEL=qwen2.5:3b" >> .env
```

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# No additional configuration needed for roadmap feature
```

### 4. Start All Services

**Terminal 1 - Ollama (if not running as service)**:
```bash
ollama serve
```

**Terminal 2 - Backend**:
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 3 - Frontend**:
```bash
cd frontend
npm run dev
```

### 5. Test the System

1. Open browser: http://localhost:3000/roadmap

2. Enter a query:
   - "How to become a data scientist"
   - "Learn web development"
   - "Master machine learning"

3. Click "Generate Roadmap"

4. Wait 30-60 seconds for generation

5. View the hierarchical roadmap!

## Verify Setup

### Check Ollama

```bash
# List installed models
ollama list

# Test model
ollama run qwen2.5:3b "Hello, how are you?"
```

### Check Backend

```bash
# Check API docs
curl http://localhost:8000/docs

# Check health endpoint
curl http://localhost:8000/health
```

### Check Frontend

Visit: http://localhost:3000

## Environment Variables

Add these to `backend/.env`:

```env
# LLM Configuration
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b

# Optional: Switch to OpenRouter
# LLM_PROVIDER=openrouter
# OPENROUTER_API_KEY=your_api_key
# OPENROUTER_MODEL=openai/gpt-4
```

## Troubleshooting

### Ollama Connection Error

**Error**: "Connection refused at localhost:11434"

**Solution**:
```bash
# Start Ollama
ollama serve

# Or check if it's running
ps aux | grep ollama
```

### Model Not Found

**Error**: "model 'qwen2.5:3b' not found"

**Solution**:
```bash
# Pull the model
ollama pull qwen2.5:3b

# Verify
ollama list
```

### Slow Generation

**Issue**: Roadmap takes > 2 minutes

**Solutions**:
1. Use a faster model:
   ```bash
   ollama pull qwen2.5:1.5b
   ```
   Update `.env`: `OLLAMA_MODEL=qwen2.5:1.5b`

2. Or use a more powerful model (slower but better):
   ```bash
   ollama pull qwen2.5:14b
   ```

3. Or switch to cloud (OpenRouter):
   ```env
   LLM_PROVIDER=openrouter
   OPENROUTER_API_KEY=your_key
   OPENROUTER_MODEL=anthropic/claude-3-haiku
   ```

### Invalid JSON Errors

**Error**: "Failed to parse JSON"

**Causes**:
- Model generates markdown
- Model adds extra text
- Model is too small

**Solutions**:
1. Check logs:
   ```bash
   tail -f backend/logs/roadmap_*.log
   ```

2. Try a larger model:
   ```bash
   ollama pull qwen2.5:7b
   ```

3. Adjust temperature in `app/services/agents.py`:
   ```python
   # Lower temperature = more consistent
   response = await LLMService.generate(
       prompt=prompt,
       temperature=0.5,  # Try 0.3-0.5
       max_tokens=2000
   )
   ```

### Dependencies Missing

**Error**: Module not found errors

**Solution**:
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

## View Logs

```bash
# Real-time logs
tail -f backend/logs/roadmap_$(date +%Y%m%d).log

# Pretty print JSON logs
cat backend/logs/roadmap_*.log | jq '.'

# Filter specific events
cat backend/logs/roadmap_*.log | jq 'select(.event == "agent_response")'
```

## Inspect Generated Roadmaps

```bash
# List all roadmaps
ls -lht backend/roadmaps/

# View latest roadmap
cat backend/roadmaps/*_final.json | tail -1 | jq '.'

# Count domains
cat backend/roadmaps/*_final.json | jq '.domains | length'
```

## Alternative Models

### Faster Models
```bash
ollama pull qwen2.5:1.5b     # Fastest, less accurate
ollama pull llama3.2:3b      # Fast, good quality
```

### Better Quality Models
```bash
ollama pull qwen2.5:7b       # Balanced
ollama pull qwen2.5:14b      # Better quality, slower
ollama pull mistral:7b       # Alternative
```

Update `.env` with chosen model:
```env
OLLAMA_MODEL=qwen2.5:7b
```

## Next Steps

- Read full documentation: `docs/roadmap.md`
- Explore the API: http://localhost:8000/docs
- Check logs for debugging
- Experiment with different queries
- Try different models

## Support

- Documentation: `docs/roadmap.md`
- Logs: `backend/logs/`
- Saved roadmaps: `backend/roadmaps/`

## Development

### Run Tests (when added)

```bash
cd backend
pytest
```

### Code Structure

```
backend/app/
├── api/roadmap.py          # API endpoints
├── services/
│   ├── llm.py              # LLM abstraction
│   └── agents.py           # Two agents
├── models/roadmap.py       # Schemas
└── core/
    ├── config.py           # Config
    └── logging.py          # Logging

frontend/app/
├── roadmap/page.tsx        # Main page
└── components/roadmap/     # Components
```

### Iterate on Prompts

Edit prompts in `backend/app/services/agents.py`:
- `Agent1DomainGenerator.SYSTEM_PROMPT`
- `Agent2SubdomainGenerator.SYSTEM_PROMPT`

Test by generating roadmaps and checking quality.
