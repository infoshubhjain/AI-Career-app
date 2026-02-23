# Shell Scripts Guide

This directory contains convenient shell scripts to streamline setup and operation of the AI Career App.

## 📋 Quick Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `setup-all.sh` | Complete setup (recommended) | First time setup |
| `setup-ollama.sh` | Setup Ollama only | Ollama issues |
| `setup-backend.sh` | Setup backend only | Backend issues |
| `setup-frontend.sh` | Setup frontend only | Frontend issues |
| `start-all.sh` | Start all services | Normal development |
| `start-backend.sh` | Start backend only | Backend development |
| `start-frontend.sh` | Start frontend only | Frontend development |
| `stop-all.sh` | Stop all services | End of session |
| `test-system.sh` | Test all components | Verify everything works |

## 🚀 First Time Setup

Run this single command to set up everything:

```bash
./setup-all.sh
```

This will:
1. ✅ Check and setup Ollama
2. ✅ Pull the qwen2.5:3b model
3. ✅ Create Python virtual environment
4. ✅ Install Python dependencies
5. ✅ Create backend `.env` file
6. ✅ Install Node.js dependencies
7. ✅ Create frontend `.env.local` file
8. ✅ Verify the setup

**Time**: 5-10 minutes (depending on internet speed)

## 🏃 Start Development

After setup, start all services with:

```bash
./start-all.sh
```

This will:
- Start Ollama (if not running)
- Start backend on http://localhost:8000
- Start frontend on http://localhost:3000

### With tmux (Recommended)

If you have tmux installed, `start-all.sh` will create a split-pane layout:
- Left pane: Backend logs
- Right pane: Frontend logs

**tmux Controls:**
- Switch panes: `Ctrl+b` then arrow keys
- Scroll mode: `Ctrl+b` then `[`
- Exit scroll: `q`
- Detach: `Ctrl+b` then `d`
- Kill session: `tmux kill-session -t aicareer`

Install tmux: `brew install tmux`

### Without tmux

Services will start in background. Check logs:
```bash
tail -f logs/backend.log
tail -f logs/frontend.log
```

## 🛑 Stop Development

Stop all running services:

```bash
./stop-all.sh
```

## 🔧 Individual Scripts

### Setup Scripts

#### `./setup-ollama.sh`
Sets up Ollama and pulls the AI model.

**What it does:**
- Checks if Ollama is installed
- Starts Ollama service
- Pulls qwen2.5:3b model
- Tests the model

**When to use:**
- Ollama-related issues
- Want to change models
- Verify Ollama setup

#### `./setup-backend.sh`
Sets up the FastAPI backend.

**What it does:**
- Checks Python 3.11+
- Creates virtual environment
- Installs dependencies from `requirements.txt`
- Creates `.env` file
- Creates `roadmaps/` and `logs/` directories
- Runs verification script

**When to use:**
- Backend setup issues
- After updating `requirements.txt`
- Clean reinstall needed

#### `./setup-frontend.sh`
Sets up the Next.js frontend.

**What it does:**
- Checks Node.js 18+
- Installs npm dependencies
- Creates `.env.local` file

**When to use:**
- Frontend setup issues
- After updating `package.json`
- Clean reinstall needed

### Start Scripts

#### `./start-backend.sh`
Starts only the backend server.

**What it does:**
- Activates Python virtual environment
- Checks/starts Ollama
- Starts uvicorn on port 8000
- Enables auto-reload

**Output:**
- API: http://localhost:8000
- Docs: http://localhost:8000/docs

#### `./start-frontend.sh`
Starts only the frontend server.

**What it does:**
- Checks for node_modules
- Verifies backend is running
- Starts Next.js dev server on port 3000

**Output:**
- App: http://localhost:3000
- Roadmap: http://localhost:3000/roadmap

## 🐛 Troubleshooting

### Script Won't Run

```bash
# Make sure it's executable
chmod +x setup-all.sh

# Run it
./setup-all.sh
```

### Port Already in Use

Scripts will automatically kill existing processes on ports 8000 and 3000.

If issues persist:
```bash
# Manually kill processes
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Ollama Won't Start

```bash
# Check if Ollama is installed
ollama --version

# Start manually
ollama serve

# Pull model manually
ollama pull qwen2.5:3b
```

### Virtual Environment Issues

```bash
# Remove and recreate
cd backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Node Modules Issues

```bash
# Remove and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 📝 Script Output

All scripts use colored output:
- 🟢 **Green**: Success
- 🔴 **Red**: Error
- 🟡 **Yellow**: Warning
- 🔵 **Blue**: Information

## 🔄 Update Workflow

When pulling updates from git:

```bash
# Update dependencies
./setup-backend.sh  # If backend changed
./setup-frontend.sh  # If frontend changed

# Or just re-run full setup
./setup-all.sh

# Restart services
./stop-all.sh
./start-all.sh
```

## 🎯 Common Workflows

### Daily Development

```bash
# Start working
./start-all.sh

# ... do your work ...

# End of day
./stop-all.sh
```

### Testing After Changes

```bash
# Backend changes
./stop-all.sh
cd backend && source venv/bin/activate
pip install -r requirements.txt  # if deps changed
cd ..
./start-all.sh

# Frontend changes
./stop-all.sh
cd frontend
npm install  # if deps changed
cd ..
./start-all.sh
```

### Clean Reinstall

```bash
# Stop everything
./stop-all.sh

# Remove everything
rm -rf backend/venv backend/roadmaps/*.json backend/logs/*.log
rm -rf frontend/node_modules frontend/.next

# Reinstall
./setup-all.sh

# Start fresh
./start-all.sh
```

## 💡 Tips

1. **Use tmux**: Much better development experience with split panes
2. **Check logs**: If something fails, look at the colored output
3. **Keep scripts updated**: Pull latest from git regularly
4. **Customize .env**: Edit `backend/.env` for your setup
5. **Different model**: Edit `backend/.env` and change `OLLAMA_MODEL`

## 🔗 Related Documentation

- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)
- **Setup Guide**: [docs/roadmap-setup.md](docs/roadmap-setup.md)
- **Full Docs**: [docs/roadmap.md](docs/roadmap.md)
- **Implementation**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

## 📦 Script Dependencies

### Required
- **bash**: Shell to run scripts
- **curl**: API health checks
- **lsof**: Port management (usually pre-installed)
- **Python 3.11+**: Backend runtime
- **Node.js 18+**: Frontend runtime
- **Ollama**: LLM runtime

### Optional
- **tmux**: Better multi-service management (recommended)
  - Install: `brew install tmux`

### Included
- **pip**: Python package manager
- **npm**: Node package manager

## 🧪 Testing

After setup, verify everything works:

```bash
./test-system.sh
```

This will test:
- ✅ Ollama connectivity
- ✅ Backend health
- ✅ Frontend accessibility
- ✅ Roadmap API
- ✅ Optional: Full roadmap generation

## 🎬 Demo

Watch the setup process:

```bash
# Full setup from scratch
time ./setup-all.sh
# Takes: 5-10 minutes

# Start everything
./start-all.sh
# Starts in: ~10 seconds

# Test the system
./test-system.sh
# Runs health checks

# Visit: http://localhost:3000/roadmap
# Generate a roadmap!

# Stop when done
./stop-all.sh
```

---

**Need help?** Check the [troubleshooting guide](docs/roadmap-setup.md#troubleshooting) or review the logs in `backend/logs/`.
