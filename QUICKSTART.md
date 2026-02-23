# AI Roadmap Generator - Quick Start

## 🚀 Get Running in 5 Minutes

### One-Command Setup (Recommended)

```bash
./setup-all.sh
```

This single command will:
- ✅ Setup Ollama and pull the AI model
- ✅ Setup backend with Python dependencies
- ✅ Setup frontend with Node dependencies
- ✅ Verify everything works

**Time**: 5-10 minutes

### Start All Services

```bash
./start-all.sh
```

Opens in split-screen with tmux (or background processes if tmux not installed).

### Test It! 🎉
1. Open: http://localhost:3000/roadmap
2. Enter: "How to become a data scientist"
3. Click: Generate Roadmap
4. Wait: 30-60 seconds
5. Enjoy: Your personalized learning path!

---

## 📝 Manual Setup (Alternative)

If you prefer step-by-step control:

### Step 1: Install Ollama
```bash
# Mac/Linux
brew install ollama

# Or download from https://ollama.ai
```

### Step 2: Setup Components
```bash
# Setup Ollama and model
./setup-ollama.sh

# Setup backend
./setup-backend.sh

# Setup frontend
./setup-frontend.sh
```

### Step 3: Start Everything
```bash
# Start all services
./start-all.sh

# Or start individually:
./start-backend.sh   # Terminal 1
./start-frontend.sh  # Terminal 2
```

### Step 4: Stop Everything
```bash
./stop-all.sh
```

---

## 📚 Documentation

- **Setup Guide**: [docs/roadmap-setup.md](docs/roadmap-setup.md)
- **Full Documentation**: [docs/roadmap.md](docs/roadmap.md)
- **Implementation Details**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

## 🔍 Verify Everything Works

### Check Ollama
```bash
ollama list
# Should show: qwen2.5:3b
```

### Check Backend
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy"}
```

### Check Frontend
Visit: http://localhost:3000

---

## 🐛 Quick Troubleshooting

### "Connection refused" to Ollama
```bash
ollama serve
```

### "Model not found"
```bash
ollama pull qwen2.5:3b
```

### Dependencies missing
```bash
# Backend
cd backend && pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

### Check logs
```bash
tail -f backend/logs/roadmap_$(date +%Y%m%d).log
```

---

## 📊 View Generated Roadmaps

```bash
# List all
ls -lht backend/roadmaps/

# View latest
cat backend/roadmaps/*_final.json | tail -1 | jq '.'

# Pretty print
cat backend/roadmaps/*_final.json | jq '.domains[].title'
```

---

## 🎯 Example Queries to Try

- "How to become a data scientist"
- "Learn web development"
- "Master machine learning"
- "Become a DevOps engineer"
- "Learn iOS development"
- "Get into cybersecurity"

---

## 📡 API Endpoints

### Generate Roadmap
```bash
curl -X POST http://localhost:8000/api/roadmap/generate \
  -H "Content-Type: application/json" \
  -d '{"query": "How to become a data scientist"}'
```

### List All Roadmaps
```bash
curl http://localhost:8000/api/roadmap/list
```

### API Documentation
http://localhost:8000/docs

---

## ⚙️ Configuration

Edit `backend/.env`:

```env
# Use different model
OLLAMA_MODEL=qwen2.5:7b

# Or switch to OpenRouter
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key
OPENROUTER_MODEL=anthropic/claude-3-sonnet
```

---

## 🎨 Architecture Overview

```
User Query
    ↓
Agent 1: Domain Generator
    ↓ (4-8 high-level domains)
Agent 2: Subdomain Generator
    ↓ (6-10 skills per domain)
Final Roadmap
    ↓
Frontend Display
```

---

## 📁 Key Files

**Backend:**
- `app/api/roadmap.py` - API endpoints
- `app/services/agents.py` - Two agents
- `app/services/llm.py` - LLM abstraction
- `app/models/roadmap.py` - Data schemas
- `roadmaps/*.json` - Generated roadmaps
- `logs/*.log` - Structured logs

**Frontend:**
- `app/roadmap/page.tsx` - Main page
- `app/components/roadmap/RoadmapForm.tsx` - Input form
- `app/components/roadmap/RoadmapDisplay.tsx` - Display

---

## 🚦 Status Check

Run this to verify everything:
```bash
cd backend && python verify_setup.py
```

Expected output:
```
✓ Python 3.11.x - OK
✓ Ollama is installed and running
✓ Model qwen2.5:3b is available
✓ All dependencies installed
✓ All directories exist
✓ .env file configured
✓ All checks passed!
```

---

## 💡 Tips

- **First run is slower**: Ollama loads model into memory
- **Smaller model = faster**: Try `qwen2.5:1.5b` for speed
- **Larger model = better**: Try `qwen2.5:14b` for quality
- **Check logs**: They show exactly what's happening
- **Inspect JSON**: See what the AI actually generated

---

## 🆘 Need Help?

1. Check the logs: `tail -f backend/logs/*.log`
2. Read setup guide: `docs/roadmap-setup.md`
3. View API docs: http://localhost:8000/docs
4. Verify setup: `python backend/verify_setup.py`

---

**Ready to generate amazing roadmaps! 🚀**
