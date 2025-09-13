@echo off
setlocal enabledelayedexpansion

REM IntelliMeet Deployment Script for Vercel (Windows)
REM This script automates the deployment process

echo.
echo 🚀 IntelliMeet Deployment Script
echo =================================
echo.

REM Function to print status messages
:print_status
echo [INFO] %~1
goto :eof

:print_success
echo [SUCCESS] %~1
goto :eof

:print_warning
echo [WARNING] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

REM Check if required tools are installed
:check_prerequisites
call :print_status "Checking prerequisites..."

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit /b 1
)

where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :print_error "npm is not installed. Please install npm."
    exit /b 1
)

where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :print_error "Git is not installed. Please install Git."
    exit /b 1
)

where vercel >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :print_warning "Vercel CLI is not installed. Installing..."
    npm install -g vercel
    if !ERRORLEVEL! neq 0 (
        call :print_error "Failed to install Vercel CLI"
        exit /b 1
    )
)

call :print_success "Prerequisites check completed!"
goto :eof

REM Install dependencies
:install_dependencies
call :print_status "Installing dependencies..."

call :print_status "Installing root dependencies..."
npm install
if %ERRORLEVEL% neq 0 (
    call :print_error "Failed to install root dependencies"
    exit /b 1
)

call :print_status "Installing backend dependencies..."
cd backend-new
npm install
if %ERRORLEVEL% neq 0 (
    call :print_error "Failed to install backend dependencies"
    exit /b 1
)
cd ..

call :print_status "Installing frontend dependencies..."
cd frontend
npm install
if %ERRORLEVEL% neq 0 (
    call :print_error "Failed to install frontend dependencies"
    exit /b 1
)
cd ..

call :print_success "Dependencies installed successfully!"
goto :eof

REM Build the application
:build_application
call :print_status "Building application..."

call :print_status "Building frontend..."
cd frontend
npm run build
if %ERRORLEVEL% neq 0 (
    call :print_error "Failed to build frontend"
    exit /b 1
)
cd ..

call :print_status "Building backend..."
cd backend-new
npm run build
if %ERRORLEVEL% neq 0 (
    call :print_error "Failed to build backend"
    exit /b 1
)
cd ..

call :print_success "Application built successfully!"
goto :eof

REM Test the build
:test_build
call :print_status "Testing build locally..."

if not exist "frontend\dist" (
    call :print_error "Frontend build not found!"
    exit /b 1
)

if not exist "backend-new\dist" (
    call :print_error "Backend build not found!"
    exit /b 1
)

call :print_success "Build test passed!"
goto :eof

REM Setup git repository
:setup_git
call :print_status "Setting up Git repository..."

if not exist ".git" (
    call :print_status "Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit for deployment"
    call :print_success "Git repository initialized!"
) else (
    call :print_status "Git repository already exists. Committing changes..."
    git add .
    git diff --staged --quiet
    if %ERRORLEVEL% neq 0 (
        for /f "tokens=*" %%i in ('powershell -command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"') do set datetime=%%i
        git commit -m "Update for deployment - !datetime!"
        call :print_success "Changes committed!"
    ) else (
        call :print_status "No changes to commit."
    )
)
goto :eof

REM Deploy to Vercel
:deploy_to_vercel
call :print_status "Deploying to Vercel..."

REM Check if user is logged in
vercel whoami >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :print_status "Please login to Vercel:"
    vercel login
)

call :print_status "Starting deployment..."

if "%1"=="production" (
    vercel --prod
) else (
    vercel
)

if %ERRORLEVEL% neq 0 (
    call :print_error "Deployment failed!"
    exit /b 1
)

call :print_success "Deployment completed!"
goto :eof

REM Set environment variables
:set_env_variables
call :print_status "Setting up environment variables..."

if exist ".env.example" (
    call :print_status "Found .env.example file."
    echo.
    call :print_warning "Please make sure to set the following environment variables in Vercel:"
    echo.
    findstr /r "^[A-Z_]*=" .env.example
    echo.
    call :print_warning "You can set them via:"
    call :print_warning "1. Vercel Dashboard > Project Settings > Environment Variables"
    call :print_warning "2. Or using: vercel env add VARIABLE_NAME value"
    echo.
)
goto :eof

REM Main function
:main
set DEPLOY_TYPE=preview
set SKIP_BUILD=false
set SKIP_DEPS=false

REM Parse arguments
:parse_args
if "%1"=="" goto run_deployment
if "%1"=="-p" (
    set DEPLOY_TYPE=production
    shift
    goto parse_args
)
if "%1"=="--production" (
    set DEPLOY_TYPE=production
    shift
    goto parse_args
)
if "%1"=="--skip-build" (
    set SKIP_BUILD=true
    shift
    goto parse_args
)
if "%1"=="--skip-deps" (
    set SKIP_DEPS=true
    shift
    goto parse_args
)
if "%1"=="-h" goto show_help
if "%1"=="--help" goto show_help
call :print_error "Unknown option: %1"
exit /b 1

:show_help
echo Usage: %0 [OPTIONS]
echo.
echo Options:
echo   -p, --production    Deploy to production
echo   --skip-build       Skip build step
echo   --skip-deps        Skip dependency installation
echo   -h, --help         Show this help message
echo.
exit /b 0

:run_deployment
echo.
call :print_status "Starting IntelliMeet deployment process..."
echo.

call :check_prerequisites
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

if "%SKIP_DEPS%"=="false" (
    call :install_dependencies
    if !ERRORLEVEL! neq 0 exit /b !ERRORLEVEL!
)

if "%SKIP_BUILD%"=="false" (
    call :build_application
    if !ERRORLEVEL! neq 0 exit /b !ERRORLEVEL!
    call :test_build
    if !ERRORLEVEL! neq 0 exit /b !ERRORLEVEL!
)

call :setup_git
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

call :set_env_variables

call :deploy_to_vercel %DEPLOY_TYPE%
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

echo.
call :print_success "🎉 Deployment completed successfully!"
echo.
call :print_status "Next steps:"
call :print_status "1. Set up environment variables in Vercel dashboard"
call :print_status "2. Configure custom domain (optional)"
call :print_status "3. Test your application thoroughly"
call :print_status "4. Set up monitoring and error tracking"
echo.
call :print_warning "Important notes:"
call :print_warning "- SQLite database won't persist in serverless environment"
call :print_warning "- WebSocket connections will fall back to polling"
call :print_warning "- Consider using a hosted database for production"
echo.

goto :eof

REM Call main function
call :main %*
