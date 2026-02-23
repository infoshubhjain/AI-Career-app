#!/usr/bin/env python3
"""
Verification script for AI Roadmap Generator setup
Checks all prerequisites and dependencies
"""

import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check Python version"""
    print("Checking Python version...")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 11:
        print(f"✓ Python {version.major}.{version.minor}.{version.micro} - OK")
        return True
    else:
        print(f"✗ Python {version.major}.{version.minor}.{version.micro} - Need 3.11+")
        return False

def check_ollama():
    """Check if Ollama is installed and running"""
    print("\nChecking Ollama...")
    try:
        result = subprocess.run(
            ["ollama", "list"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            print("✓ Ollama is installed and running")
            
            # Check for qwen2.5:3b model
            if "qwen2.5:3b" in result.stdout:
                print("✓ Model qwen2.5:3b is available")
                return True
            else:
                print("✗ Model qwen2.5:3b not found")
                print("  Run: ollama pull qwen2.5:3b")
                return False
        else:
            print("✗ Ollama command failed")
            return False
    except FileNotFoundError:
        print("✗ Ollama not found")
        print("  Install from: https://ollama.ai")
        return False
    except Exception as e:
        print(f"✗ Error checking Ollama: {e}")
        return False

def check_dependencies():
    """Check if Python dependencies are installed"""
    print("\nChecking Python dependencies...")
    required = [
        "fastapi",
        "uvicorn",
        "pydantic",
        "httpx",
        "slugify"
    ]
    
    all_installed = True
    for package in required:
        try:
            __import__(package)
            print(f"✓ {package} - installed")
        except ImportError:
            print(f"✗ {package} - not installed")
            all_installed = False
    
    if not all_installed:
        print("\n  Run: pip install -r requirements.txt")
    
    return all_installed

def check_directories():
    """Check if required directories exist"""
    print("\nChecking directories...")
    base_dir = Path(__file__).parent
    
    dirs = [
        base_dir / "roadmaps",
        base_dir / "logs",
        base_dir / "app" / "api",
        base_dir / "app" / "services",
        base_dir / "app" / "models"
    ]
    
    all_exist = True
    for dir_path in dirs:
        if dir_path.exists():
            print(f"✓ {dir_path.relative_to(base_dir)} - exists")
        else:
            print(f"✗ {dir_path.relative_to(base_dir)} - missing")
            all_exist = False
    
    return all_exist

def check_env_file():
    """Check if .env file exists and has LLM config"""
    print("\nChecking .env file...")
    env_path = Path(__file__).parent / ".env"
    
    if not env_path.exists():
        print("✗ .env file not found")
        print("  Copy from .env.example and configure")
        return False
    
    print("✓ .env file exists")
    
    # Check for LLM configuration
    with open(env_path, "r") as f:
        content = f.read()
    
    required_vars = ["LLM_PROVIDER", "OLLAMA_BASE_URL", "OLLAMA_MODEL"]
    missing = []
    
    for var in required_vars:
        if var not in content:
            missing.append(var)
    
    if missing:
        print(f"✗ Missing config: {', '.join(missing)}")
        print("  Add to .env:")
        print("    LLM_PROVIDER=ollama")
        print("    OLLAMA_BASE_URL=http://localhost:11434")
        print("    OLLAMA_MODEL=qwen2.5:3b")
        return False
    else:
        print("✓ LLM configuration found")
        return True

def main():
    """Run all checks"""
    print("=" * 60)
    print("AI Roadmap Generator - Setup Verification")
    print("=" * 60)
    
    checks = [
        check_python_version(),
        check_ollama(),
        check_dependencies(),
        check_directories(),
        check_env_file()
    ]
    
    print("\n" + "=" * 60)
    if all(checks):
        print("✓ All checks passed!")
        print("\nYou can start the backend:")
        print("  uvicorn app.main:app --reload")
        print("\nThen visit the API docs:")
        print("  http://localhost:8000/docs")
        return 0
    else:
        print("✗ Some checks failed")
        print("\nPlease fix the issues above and run again.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
