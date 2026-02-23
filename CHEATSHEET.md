# AI Career App - Command Cheatsheet

Quick reference for all commands and scripts.

## 🚀 Essential Commands

```bash
# First time setup (run once)
./setup-all.sh

# Daily usage
./start-all.sh        # Start working
./stop-all.sh         # Stop working

# Verify system
./test-system.sh
```

## 📜 All Scripts

| Command | What It Does | Time |
|---------|--------------|------|
| `./check-python.sh` | Check Python versions | 5 sec |
| `./setup-all.sh` | Complete setup | 5-10 min |
| `./setup-ollama.sh` | Setup Ollama + model | 2-5 min |
| `./setup-backend.sh` | Setup Python backend | 2-3 min |
| `./setup-frontend.sh` | Setup Node.js frontend | 2-3 min |
| `./start-all.sh` | Start all services | 10 sec |
| `./start-backend.sh` | Start backend only | 5 sec |
| `./start-frontend.sh` | Start frontend only | 5 sec |
| `./stop-all.sh` | Stop all services | 5 sec |
| `./test-system.sh` | Run health checks | 30 sec |

## 🔗 URLs

| Service | URL |
|---------|-----|
| **App** | http://localhost:3000 |
| **Roadmap** | http://localhost:3000/roadmap |
| **API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |
| **ReDoc** | http://localhost:8000/redoc |
| **Ollama** | http://localhost:11434 |

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Python version error | `./check-python.sh` then `./setup-backend.sh` |
| Port in use | `./stop-all.sh` then `./start-all.sh` |
| Ollama not working | `./setup-ollama.sh` |
| Backend issues | `./setup-backend.sh` |
| Frontend issues | `./setup-frontend.sh` |
| Everything broken | `./stop-all.sh && ./setup-all.sh` |

## 📊 Port Reference

| Port | Service |
|------|---------|
| 3000 | Frontend (Next.js) |
| 8000 | Backend (FastAPI) |
| 11434 | Ollama (LLM) |

## 📝 Useful Commands

```bash
# Check Python versions
./check-python.sh

# View logs
tail -f backend/logs/roadmap_$(date +%Y%m%d).log

# List generated roadmaps
ls -lht backend/roadmaps/*_final.json

# View latest roadmap
cat backend/roadmaps/*_final.json | tail -1 | jq '.'

# Check what's using a port
lsof -i :8000

# Kill process on port
lsof -ti:8000 | xargs kill -9

# Check Ollama models
ollama list

# Test Ollama
ollama run qwen2.5:3b "Hello"

# Backend verification
curl http://localhost:8000/health

# API test
curl -X POST http://localhost:8000/api/roadmap/generate \
  -H "Content-Type: application/json" \
  -d '{"query":"test"}'
```

## 🎮 Tmux Controls

When using `./start-all.sh` with tmux:

| Key | Action |
|-----|--------|
| `Ctrl+b` then `→` | Switch to right pane |
| `Ctrl+b` then `←` | Switch to left pane |
| `Ctrl+b` then `[` | Scroll mode (use arrows) |
| `q` | Exit scroll mode |
| `Ctrl+b` then `d` | Detach from session |
| `tmux attach -t aicareer` | Reattach |
| `tmux kill-session -t aicareer` | Kill session |

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `backend/.env` | Backend config (LLM, API keys) |
| `frontend/.env.local` | Frontend config (API URL) |
| `backend/requirements.txt` | Python dependencies |
| `frontend/package.json` | Node dependencies |

## 🎯 Common Workflows

**Daily Start:**
```bash
./start-all.sh
# Open: http://localhost:3000/roadmap
```

**Daily End:**
```bash
./stop-all.sh
```

**After Git Pull:**
```bash
./stop-all.sh
./setup-backend.sh   # if backend changed
./setup-frontend.sh  # if frontend changed
./start-all.sh
```

**Clean Reinstall:**
```bash
./stop-all.sh
rm -rf backend/venv frontend/node_modules
./setup-all.sh
```

**Test Roadmap Generation:**
```bash
curl -X POST http://localhost:8000/api/roadmap/generate \
  -H "Content-Type: application/json" \
  -d '{"query":"How to become a data scientist"}' \
  | jq '.'
```

## 📚 Documentation

| File | Description |
|------|-------------|
| `README.md` | Main project readme |
| `QUICKSTART.md` | 5-minute setup guide |
| `SCRIPTS_README.md` | Detailed script docs |
| `WORKFLOW.md` | Visual workflows |
| `SCRIPTS_SUMMARY.md` | Script analysis |
| `CHEATSHEET.md` | This file |
| `docs/roadmap.md` | Full system docs |
| `docs/roadmap-setup.md` | Setup guide |

## 🎨 Color Codes

Scripts use colors for clarity:

- 🟢 **Green ✓**: Success
- 🔴 **Red ✗**: Error/Failure
- 🟡 **Yellow ⚠**: Warning
- 🔵 **Blue ℹ**: Information

## 💡 Quick Tips

1. Always run scripts from project root
2. Use `./start-all.sh` for best experience (tmux)
3. Check logs when things break
4. `./test-system.sh` verifies everything
5. `./stop-all.sh` is your friend

## 🆘 Emergency Commands

```bash
# Nuclear option - stop everything
./stop-all.sh
killall ollama
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Clean slate
rm -rf backend/venv backend/roadmaps/*.json backend/logs/*.log
rm -rf frontend/node_modules frontend/.next
./setup-all.sh
```

## 📱 Quick Reference

**First time?**
```bash
./setup-all.sh && ./start-all.sh
```

**Daily?**
```bash
./start-all.sh
```

**Done?**
```bash
./stop-all.sh
```

**Broken?**
```bash
./test-system.sh
```

---

**Print this and keep it handy! 📌**

For more details: [SCRIPTS_README.md](SCRIPTS_README.md)
