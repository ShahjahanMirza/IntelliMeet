#!/bin/bash

# IntelliMeet Deployment Script for Vercel
# This script automates the deployment process

set -e  # Exit on any error

echo "🚀 IntelliMeet Deployment Script"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi

    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git."
        exit 1
    fi

    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI is not installed. Installing..."
        npm install -g vercel
    fi

    print_success "Prerequisites check completed!"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."

    # Root dependencies
    print_status "Installing root dependencies..."
    npm install

    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd backend-new
    npm install
    cd ..

    # Frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..

    print_success "Dependencies installed successfully!"
}

# Build the application
build_application() {
    print_status "Building application..."

    # Build frontend
    print_status "Building frontend..."
    cd frontend
    npm run build
    cd ..

    # Build backend
    print_status "Building backend..."
    cd backend-new
    npm run build
    cd ..

    print_success "Application built successfully!"
}

# Test the build
test_build() {
    print_status "Testing build locally..."

    # Check if frontend build exists
    if [ ! -d "frontend/dist" ]; then
        print_error "Frontend build not found!"
        exit 1
    fi

    # Check if backend build exists
    if [ ! -d "backend-new/dist" ]; then
        print_error "Backend build not found!"
        exit 1
    fi

    print_success "Build test passed!"
}

# Setup git repository
setup_git() {
    print_status "Setting up Git repository..."

    if [ ! -d ".git" ]; then
        print_status "Initializing Git repository..."
        git init
        git add .
        git commit -m "Initial commit for deployment"
        print_success "Git repository initialized!"
    else
        print_status "Git repository already exists. Committing changes..."
        git add .
        if git diff --staged --quiet; then
            print_status "No changes to commit."
        else
            git commit -m "Update for deployment - $(date)"
            print_success "Changes committed!"
        fi
    fi
}

# Deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel..."

    # Check if user is logged in
    if ! vercel whoami &> /dev/null; then
        print_status "Please login to Vercel:"
        vercel login
    fi

    # Deploy
    print_status "Starting deployment..."

    # First deployment or subsequent
    if [ "$1" == "production" ]; then
        vercel --prod
    else
        vercel
    fi

    print_success "Deployment completed!"
}

# Set environment variables
set_env_variables() {
    print_status "Setting up environment variables..."

    # Check if .env.example exists
    if [ -f ".env.example" ]; then
        print_status "Found .env.example file."
        print_warning "Please make sure to set the following environment variables in Vercel:"
        echo ""
        cat .env.example | grep -E '^[A-Z_]+=' | sed 's/=.*$//' | while read var; do
            echo "  - $var"
        done
        echo ""
        print_warning "You can set them via:"
        print_warning "1. Vercel Dashboard > Project Settings > Environment Variables"
        print_warning "2. Or using: vercel env add VARIABLE_NAME value"
    fi
}

# Main deployment function
main() {
    echo ""
    print_status "Starting IntelliMeet deployment process..."
    echo ""

    # Parse arguments
    DEPLOY_TYPE="preview"
    SKIP_BUILD=false
    SKIP_DEPS=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--production)
                DEPLOY_TYPE="production"
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  -p, --production    Deploy to production"
                echo "  --skip-build       Skip build step"
                echo "  --skip-deps        Skip dependency installation"
                echo "  -h, --help         Show this help message"
                echo ""
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Run deployment steps
    check_prerequisites

    if [ "$SKIP_DEPS" = false ]; then
        install_dependencies
    fi

    if [ "$SKIP_BUILD" = false ]; then
        build_application
        test_build
    fi

    setup_git
    set_env_variables
    deploy_to_vercel "$DEPLOY_TYPE"

    echo ""
    print_success "🎉 Deployment completed successfully!"
    echo ""
    print_status "Next steps:"
    print_status "1. Set up environment variables in Vercel dashboard"
    print_status "2. Configure custom domain (optional)"
    print_status "3. Test your application thoroughly"
    print_status "4. Set up monitoring and error tracking"
    echo ""
    print_warning "Important notes:"
    print_warning "- SQLite database won't persist in serverless environment"
    print_warning "- WebSocket connections will fall back to polling"
    print_warning "- Consider using a hosted database for production"
    echo ""
}

# Error handling
trap 'print_error "Deployment failed! Check the error messages above."' ERR

# Run main function
main "$@"
