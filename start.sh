#!/bin/bash

# TravelGuard - Security Alert Monitoring System
# Start script with port cleanup, database setup, seeding, and hot-reload

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║           🛡️  TravelGuard Security Operations           ║"
echo "║         Travel Security Alert Monitoring System          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
    echo -e "${RED}✗ .env file not found! Please create one.${NC}"
    exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}  Killing process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# Cleanup used ports
echo -e "\n${CYAN}[1/6] Cleaning up ports...${NC}"
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT
echo -e "${GREEN}✓ Ports $BACKEND_PORT and $FRONTEND_PORT are free${NC}"

# Check PostgreSQL
echo -e "\n${CYAN}[2/6] Checking PostgreSQL...${NC}"
if command -v pg_isready &> /dev/null; then
    if pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    else
        echo -e "${YELLOW}⚠ PostgreSQL is not running. Attempting to start...${NC}"
        if command -v brew &> /dev/null; then
            brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
            sleep 2
        fi
        if ! pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} &> /dev/null; then
            echo -e "${RED}✗ Could not start PostgreSQL. Please start it manually.${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ PostgreSQL started${NC}"
    fi
else
    echo -e "${YELLOW}⚠ pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# Create database if it doesn't exist
echo -e "\n${CYAN}[3/6] Setting up database...${NC}"
if command -v createdb &> /dev/null; then
    createdb -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} ${DB_NAME:-travelsecurity} 2>/dev/null || true
fi
echo -e "${GREEN}✓ Database '${DB_NAME:-travelsecurity}' ready${NC}"

# Install dependencies
echo -e "\n${CYAN}[4/6] Installing dependencies...${NC}"
cd backend
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    npm install --silent 2>&1 | tail -1
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Backend dependencies up to date${NC}"
fi

cd ../frontend
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    npm install --silent 2>&1 | tail -1
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Frontend dependencies up to date${NC}"
fi
cd ..

# Seed database
echo -e "\n${CYAN}[5/6] Seeding database...${NC}"
cd backend
node db/seed.js
echo -e "${GREEN}✓ Database seeded with sample data${NC}"
cd ..

# Start services with hot-reload
echo -e "\n${CYAN}[6/6] Starting services with hot-reload...${NC}"
echo ""

# Start backend with nodemon (hot-reload)
cd backend
npx nodemon server.js &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Start frontend with Vite (built-in hot-reload)
cd frontend
npx vite --port $FRONTEND_PORT &
FRONTEND_PID=$!
cd ..

# Trap to cleanup on exit
cleanup() {
    echo -e "\n\n${YELLOW}Shutting down TravelGuard...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              🛡️  TravelGuard is running!                ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Frontend:  ${CYAN}http://localhost:${FRONTEND_PORT}${GREEN}                        ║${NC}"
echo -e "${GREEN}║  Backend:   ${CYAN}http://localhost:${BACKEND_PORT}${GREEN}                        ║${NC}"
echo -e "${GREEN}║  API Docs:  ${CYAN}http://localhost:${BACKEND_PORT}/api/health${GREEN}             ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Login:     ${CYAN}admin@travelsecurity.com / Admin123!${GREEN}       ║${NC}"
echo -e "${GREEN}║  Hot-reload is ${CYAN}ACTIVE${GREEN} - changes auto-refresh          ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Press ${RED}Ctrl+C${GREEN} to stop all services                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Wait for background processes
wait
