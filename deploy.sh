#!/bin/bash

# Troika CRM Deployment Script
# Run this script on your EC2 instance after transferring files

set -e  # Exit on error

echo "🚀 Starting Troika CRM Deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create logs directory
echo -e "${BLUE}Creating logs directory...${NC}"
mkdir -p /var/www/troika-crm/logs

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
cd /var/www/troika-crm
npm ci --production

# Generate Prisma client
echo -e "${BLUE}Generating Prisma client...${NC}"
npx prisma generate

# Build the application
echo -e "${BLUE}Building Next.js application...${NC}"
npm run build

# Stop PM2 if running
echo -e "${BLUE}Stopping existing PM2 process...${NC}"
pm2 stop troika-crm || true
pm2 delete troika-crm || true

# Start with PM2
echo -e "${BLUE}Starting application with PM2...${NC}"
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 startup
echo -e "${BLUE}Setting up PM2 startup...${NC}"
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}Application is running on port 3000${NC}"
echo ""
echo "Next steps:"
echo "1. Configure Nginx: sudo cp nginx.conf /etc/nginx/sites-available/troika-crm"
echo "2. Enable site: sudo ln -s /etc/nginx/sites-available/troika-crm /etc/nginx/sites-enabled/"
echo "3. Test Nginx: sudo nginx -t"
echo "4. Reload Nginx: sudo systemctl reload nginx"
echo "5. Setup SSL: sudo certbot --nginx -d crm.troikatech.in"
