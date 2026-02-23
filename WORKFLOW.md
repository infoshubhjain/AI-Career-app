# Development Workflow Guide

Visual guide to shell scripts and development workflow.

## 🎯 Quick Navigation

```
First Time User → setup-all.sh → start-all.sh → Visit App
                                              ↓
Returning User → start-all.sh → Continue Work
                              ↓
End of Day → stop-all.sh
```

## 📊 Script Relationship Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    SETUP PHASE                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  setup-all.sh (Master Setup)                           │
│       │                                                 │
│       ├──► setup-ollama.sh                             │
│       │         └── Pull qwen2.5:3b model              │
│       │                                                 │
│       ├──► setup-backend.sh                            │
│       │         ├── Create venv                        │
│       │         ├── Install requirements.txt           │
│       │         ├── Create .env                        │
│       │         └── Run verify_setup.py                │
│       │                                                 │
│       └──► setup-frontend.sh                           │
│                 ├── Install npm packages               │
│                 └── Create .env.local                  │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  RUNTIME PHASE                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  start-all.sh (Master Start)                           │
│       │                                                 │
│       ├──► Check/Start Ollama                          │
│       │         └── Port 11434                         │
│       │                                                 │
│       ├──► start-backend.sh                            │
│       │         ├── Activate venv                      │
│       │         ├── Start uvicorn                      │
│       │         └── Port 8000                          │
│       │                                                 │
│       └──► start-frontend.sh                           │
│                 ├── Check backend                      │
│                 ├── Start Next.js                      │
│                 └── Port 3000                          │
│                                                         │
│  stop-all.sh (Master Stop)                             │
│       └──► Kill processes on ports 8000, 3000         │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  TESTING PHASE                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  test-system.sh                                        │
│       ├──► Test Ollama (port 11434)                   │
│       ├──► Test Backend (port 8000/health)            │
│       ├──► Test Frontend (port 3000)                   │
│       ├──► Test Roadmap List API                      │
│       └──► Optional: Test Roadmap Generation          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Development Workflows

### Workflow 1: First Time Setup

```bash
# Day 1: Initial Setup
./setup-all.sh          # One command to rule them all
                        # ✓ Ollama + Model
                        # ✓ Backend + venv + deps
                        # ✓ Frontend + node_modules
                        # Time: 5-10 minutes

./start-all.sh          # Start all services
                        # Opens in tmux with split panes
                        # OR runs in background

./test-system.sh        # Verify everything works
                        # Runs 5 health checks

# Open browser
open http://localhost:3000/roadmap

# Generate your first roadmap!
# Try: "How to become a data scientist"

# End of day
./stop-all.sh           # Clean shutdown
```

### Workflow 2: Daily Development

```bash
# Morning: Start working
./start-all.sh

# ... code code code ...

# Test changes
./test-system.sh

# View logs
tail -f backend/logs/roadmap_$(date +%Y%m%d).log

# Evening: Stop
./stop-all.sh
```

### Workflow 3: Backend Only Development

```bash
# Start just backend
./start-backend.sh

# Make changes to Python code
# uvicorn auto-reloads!

# Test API
curl http://localhost:8000/docs

# View logs in terminal
# (logs are displayed live)

# Stop
# Ctrl+C
```

### Workflow 4: Frontend Only Development

```bash
# Assume backend is already running
./start-frontend.sh

# Make changes to React/Next.js code
# Next.js auto-reloads!

# View in browser
open http://localhost:3000/roadmap

# Stop
# Ctrl+C
```

### Workflow 5: Troubleshooting

```bash
# Something is broken...

# 1. Stop everything
./stop-all.sh

# 2. Test individual components
./setup-ollama.sh       # Check Ollama
./setup-backend.sh      # Reinstall backend
./setup-frontend.sh     # Reinstall frontend

# 3. Start again
./start-all.sh

# 4. Run tests
./test-system.sh

# 5. Check logs
tail -f backend/logs/*.log
```

### Workflow 6: Clean Reinstall

```bash
# Nuclear option: Start fresh

# 1. Stop everything
./stop-all.sh

# 2. Remove everything
rm -rf backend/venv
rm -rf backend/roadmaps/*.json
rm -rf backend/logs/*.log
rm -rf frontend/node_modules
rm -rf frontend/.next

# 3. Reinstall from scratch
./setup-all.sh

# 4. Start fresh
./start-all.sh

# 5. Verify
./test-system.sh
```

## 🎯 Use Case Matrix

| Task | Script to Use | Additional Commands |
|------|---------------|---------------------|
| **First time setup** | `./setup-all.sh` | None |
| **Daily start** | `./start-all.sh` | None |
| **Daily stop** | `./stop-all.sh` | None |
| **Verify setup** | `./test-system.sh` | None |
| **Backend only** | `./start-backend.sh` | `Ctrl+C` to stop |
| **Frontend only** | `./start-frontend.sh` | `Ctrl+C` to stop |
| **Update backend deps** | `./setup-backend.sh` | Then `./start-all.sh` |
| **Update frontend deps** | `./setup-frontend.sh` | Then `./start-all.sh` |
| **Change AI model** | Edit `.env`, then `./start-all.sh` | `OLLAMA_MODEL=qwen2.5:7b` |
| **Check Ollama** | `./setup-ollama.sh` | `ollama list` |
| **View API docs** | Browser | `http://localhost:8000/docs` |
| **View logs** | `tail -f backend/logs/*.log` | Or check tmux panes |
| **Clean reinstall** | Delete dirs, `./setup-all.sh` | See Workflow 6 |

## 🎨 Tmux Layout (when using start-all.sh)

```
┌────────────────────────────────────────────────────────┐
│                    Terminal                            │
├──────────────────────┬─────────────────────────────────┤
│                      │                                 │
│   Backend Logs       │     Frontend Logs               │
│                      │                                 │
│   FastAPI            │     Next.js                     │
│   Port: 8000         │     Port: 3000                  │
│                      │                                 │
│   [Agent calls]      │     [Page renders]              │
│   [LLM responses]    │     [Hot reloads]               │
│   [Validations]      │     [Requests]                  │
│   [File saves]       │                                 │
│                      │                                 │
│                      │                                 │
├──────────────────────┴─────────────────────────────────┤
│  Session: aicareer                                     │
│  Switch panes: Ctrl+b + arrows                         │
│  Detach: Ctrl+b + d                                    │
│  Kill: tmux kill-session -t aicareer                   │
└────────────────────────────────────────────────────────┘
```

## 🚦 Status Indicators

When running `./test-system.sh`:

- 🟢 **Green ✓**: Component working
- 🔴 **Red ✗**: Component failed
- 🟡 **Yellow ⚠**: Warning or optional
- 🔵 **Blue**: Informational

## 📝 Common Commands

```bash
# Setup
./setup-all.sh              # Full setup
./setup-ollama.sh           # Just Ollama
./setup-backend.sh          # Just backend
./setup-frontend.sh         # Just frontend

# Start
./start-all.sh              # Everything (tmux)
./start-backend.sh          # Backend only
./start-frontend.sh         # Frontend only

# Stop
./stop-all.sh               # Everything
Ctrl+C                      # Individual service

# Test
./test-system.sh            # System tests
curl localhost:8000/health  # Backend health
curl localhost:3000         # Frontend health

# Logs
tail -f backend/logs/*.log                      # Backend logs
tail -f logs/backend.log                        # Start script logs
cat backend/roadmaps/*_final.json | jq '.'     # View roadmaps

# Tmux
tmux attach -t aicareer     # Attach to session
tmux ls                      # List sessions
Ctrl+b + arrows              # Switch panes
Ctrl+b + d                   # Detach
```

## 🎯 Decision Tree

```
Need to work on the project?
│
├─ First time? 
│  └─ YES → ./setup-all.sh → ./start-all.sh
│
├─ Returning?
│  └─ YES → ./start-all.sh
│
├─ Something broken?
│  └─ YES → ./stop-all.sh → ./setup-all.sh → ./start-all.sh
│
├─ Just backend?
│  └─ YES → ./start-backend.sh
│
├─ Just frontend?
│  └─ YES → ./start-frontend.sh
│
├─ Need to verify?
│  └─ YES → ./test-system.sh
│
└─ Done for the day?
   └─ YES → ./stop-all.sh
```

## 💡 Pro Tips

1. **Use tmux**: Install with `brew install tmux` for best experience
2. **Alias scripts**: Add to your `.bashrc` or `.zshrc`:
   ```bash
   alias ai-start='cd ~/path/to/AI-Career-app && ./start-all.sh'
   alias ai-stop='cd ~/path/to/AI-Career-app && ./stop-all.sh'
   ```
3. **Watch logs**: Keep a terminal with `tail -f` running
4. **Check ports**: Use `lsof -i :8000` to see what's using a port
5. **Hot reload works**: Both backend and frontend auto-reload on changes

## 🔗 Related Files

- **Script Details**: [SCRIPTS_README.md](SCRIPTS_README.md)
- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)
- **Setup Guide**: [docs/roadmap-setup.md](docs/roadmap-setup.md)
- **Full Documentation**: [docs/roadmap.md](docs/roadmap.md)

---

**Happy Coding! 🚀**
