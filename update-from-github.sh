#!/bin/bash

# Troika CRM - Update from GitHub Script
# Run this on EC2 to pull latest changes and rebuild

set -e  # Exit on error

echo "🔄 Updating Troika CRM from GitHub..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

cd /var/www/troika-crm

# Stash any local changes
echo -e "${BLUE}Stashing local changes...${NC}"
git stash

# Pull latest changes from GitHub
echo -e "${BLUE}Pulling latest changes from GitHub...${NC}"
git pull origin main

# Install dependencies (only if package.json changed)
echo -e "${BLUE}Installing dependencies...${NC}"
npm ci

# Generate Prisma client
echo -e "${BLUE}Generating Prisma client...${NC}"
npx prisma generate

# Build the application
echo -e "${BLUE}Building Next.js application...${NC}"
npm run build

# Restart PM2
echo -e "${BLUE}Restarting application with PM2...${NC}"
pm2 restart troika-crm

echo -e "${GREEN}✅ Update complete!${NC}"
echo -e "${GREEN}Application is now running with the latest code from GitHub${NC}"

# Show status
pm2 status troika-crm
