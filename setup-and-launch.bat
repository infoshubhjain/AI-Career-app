@echo off
REM AI Career App - Windows Setup and Launch Script

echo ========================================
echo AI Career App - Complete Setup ^& Launch
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "frontend" (
    echo Error: frontend directory not found!
    echo Please run this script from the AI-Career-app root directory
    pause
    exit /b 1
)

echo Step 1/5: Checking prerequisites...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% is installed

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm is not installed!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION% is installed
echo.

echo Step 2/5: Installing dependencies...
cd frontend

if exist "node_modules" (
    echo [WARNING] node_modules already exists, skipping installation
) else (
    echo Running npm install (this may take a few minutes^)...
    call npm install
    echo [OK] Dependencies installed!
)
echo.

echo Step 3/5: Setting up environment...
if not exist ".env.local" (
    echo [WARNING] .env.local not found - creating from template...
    (
        echo # Supabase Configuration
        echo NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
        echo NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder
        echo.
        echo # Google AI ^(Gemini^)
        echo GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key
    ) > .env.local
    echo [OK] Created .env.local file
    echo.
    echo [WARNING] IMPORTANT: You need to add your API credentials!
    echo.
    echo Please update the following in frontend\.env.local:
    echo   1. NEXT_PUBLIC_SUPABASE_URL - Get from https://supabase.com
    echo   2. NEXT_PUBLIC_SUPABASE_ANON_KEY - From your Supabase project
    echo   3. GOOGLE_GENERATIVE_AI_API_KEY - Get from https://makersuite.google.com
    echo.
) else (
    echo [OK] .env.local already exists
)
echo.

echo Step 4/5: Verifying setup...
if not exist "package.json" (
    echo [ERROR] package.json not found!
    pause
    exit /b 1
)
echo [OK] package.json found
echo.

echo Step 5/5: Launching development server...
echo.
echo ========================================
echo [OK] Setup complete!
echo ========================================
echo.
echo Starting Next.js development server...
echo The app will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

REM Start the dev server
call npm run dev
