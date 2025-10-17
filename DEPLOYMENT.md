# AWS EC2 Deployment Guide
## Troika Tech CRM - crm.troikatech.in

---

## ✅ Pre-Deployment Checklist (COMPLETED)

- [x] Created `.gitignore` to protect sensitive files
- [x] Generated strong `NEXTAUTH_SECRET`
- [x] Switched database to MongoDB (production-ready)
- [x] Updated environment variables
- [x] Removed dummy data from database

---

## 📋 What You Need Before Starting

1. **AWS EC2 Instance**
   - Recommended: t3.small (2 vCPU, 2GB RAM)
   - OS: Ubuntu 22.04 LTS or Amazon Linux 2023
   - Storage: 20GB minimum

2. **Domain Access**
   - Access to cPanel for troikatech.in
   - Ability to add DNS A record

3. **MongoDB Atlas**
   - Already configured (connection string in .env)
   - Ensure your database user has proper permissions

---

## 🚀 Step-by-Step Deployment

### Step 1: Configure DNS in cPanel

1. Login to your cPanel
2. Go to **Zone Editor** or **DNS Manager**
3. Add an **A Record**:
   - **Name**: `crm`
   - **Type**: `A`
   - **Value**: Your EC2 instance public IP (e.g., `3.108.23.45`)
   - **TTL**: 300 (or default)
4. Save and wait 5-60 minutes for DNS propagation
5. Test with: `ping crm.troikatech.in` (should show your EC2 IP)

---

### Step 2: Setup EC2 Instance

#### 2.1 Connect to EC2
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
# OR for Amazon Linux:
ssh -i your-key.pem ec2-user@your-ec2-ip
```

#### 2.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
# For Amazon Linux:
# sudo yum update -y
```

#### 2.3 Install Node.js (v18 LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v  # Should show v18.x.x
npm -v   # Should show 9.x.x or higher
```

#### 2.4 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

#### 2.5 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

### Step 3: Deploy Application

#### 3.1 Create Application Directory
```bash
cd /var/www
sudo mkdir -p troika-crm
sudo chown -R $USER:$USER /var/www/troika-crm
cd /var/www/troika-crm
```

#### 3.2 Clone Your Repository
```bash
# If using Git (recommended):
git clone https://github.com/your-username/troika-crm.git .

# OR upload files via SCP from your local machine:
# scp -i your-key.pem -r "C:\Users\USER\Desktop\Apps\Full Code\*" ubuntu@your-ec2-ip:/var/www/troika-crm/
```

#### 3.3 Install Dependencies
```bash
npm ci --production
# This uses package-lock.json for exact versions
```

#### 3.4 Create Production Environment File
```bash
nano .env
```

Paste this content (copy from .env.production):
```env
DATABASE_URL="mongodb+srv://imkish18_db_user:XOST3wpObLXdncMt@cluster0.hxdt4xi.mongodb.net/crm_database?retryWrites=true&w=majority&appName=Cluster0"
NEXTAUTH_URL="https://crm.troikatech.in"
NEXTAUTH_SECRET="Wl4dsySPil5Eie0JTBXvjnB1YgROjkueibFx8Pu4mwU="
NODE_ENV="production"
```

Save with: `Ctrl+X`, then `Y`, then `Enter`

#### 3.5 Setup Prisma
```bash
npx prisma generate
```

#### 3.6 Build the Application
```bash
npm run build
```

This will create an optimized production build (takes 1-3 minutes).

---

### Step 4: Configure PM2

#### 4.1 Create PM2 Ecosystem File
```bash
nano ecosystem.config.js
```

Paste this content:
```javascript
module.exports = {
  apps: [{
    name: 'troika-crm',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

Save with: `Ctrl+X`, then `Y`, then `Enter`

#### 4.2 Start Application with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the command it outputs
```

#### 4.3 Verify Application is Running
```bash
pm2 status
pm2 logs troika-crm  # Press Ctrl+C to exit logs

# Test locally
curl http://localhost:3000
```

---

### Step 5: Configure Nginx Reverse Proxy

#### 5.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/troika-crm
```

Paste this content:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name crm.troikatech.in;

    # Redirect HTTP to HTTPS (after SSL is setup)
    # Uncomment after Step 6:
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Save with: `Ctrl+X`, then `Y`, then `Enter`

#### 5.2 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/troika-crm /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

#### 5.3 Configure EC2 Security Group
In AWS Console:
1. Go to **EC2 Dashboard** → **Security Groups**
2. Select your instance's security group
3. Add **Inbound Rules**:
   - Type: HTTP, Port: 80, Source: 0.0.0.0/0
   - Type: HTTPS, Port: 443, Source: 0.0.0.0/0
   - Type: SSH, Port: 22, Source: Your IP (for security)

---

### Step 6: Setup SSL Certificate (HTTPS)

#### 6.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### 6.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d crm.troikatech.in
```

Follow the prompts:
- Enter email address
- Agree to terms
- Choose option 2 (Redirect HTTP to HTTPS)

#### 6.3 Test SSL Auto-Renewal
```bash
sudo certbot renew --dry-run
```

---

### Step 7: Final Verification

#### 7.1 Test Your Application
1. Open browser: `https://crm.troikatech.in`
2. You should see the login page
3. Register a new user (first user will be regular USER role)
4. Verify you can create leads

#### 7.2 Monitor Application
```bash
# View logs
pm2 logs troika-crm

# Check status
pm2 status

# Restart if needed
pm2 restart troika-crm

# Stop application
pm2 stop troika-crm
```

---

## 🔧 Maintenance Commands

### Update Application Code
```bash
cd /var/www/troika-crm
git pull  # If using Git
npm ci --production
npm run build
pm2 restart troika-crm
```

### View Logs
```bash
# Application logs
pm2 logs troika-crm

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Database Operations
```bash
# Open Prisma Studio (in development mode only)
npx prisma studio

# View database
npx prisma db seed  # Run seed (currently does nothing)
```

---

## 🔒 Security Checklist

- [x] `.env` file is not committed to Git (protected by .gitignore)
- [x] Strong `NEXTAUTH_SECRET` generated
- [x] MongoDB using Atlas (not exposed)
- [x] EC2 Security Group restricts SSH to your IP only
- [ ] Setup SSL certificate (Step 6)
- [ ] Enable firewall: `sudo ufw enable`
- [ ] Regular updates: `sudo apt update && sudo apt upgrade`
- [ ] Setup CloudWatch monitoring (optional)

---

## 📊 Monitoring & Backups

### MongoDB Backups (Atlas)
- MongoDB Atlas provides automatic daily backups
- Access via Atlas Dashboard → Backup tab

### Application Monitoring
```bash
# Install monitoring tools (optional)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🆘 Troubleshooting

### Application won't start
```bash
pm2 logs troika-crm  # Check for errors
cat .env  # Verify environment variables
node -v  # Check Node.js version (should be 18+)
```

### Can't access website
```bash
# Check if app is running
pm2 status

# Check if Nginx is running
sudo systemctl status nginx

# Check Nginx configuration
sudo nginx -t

# Check DNS
ping crm.troikatech.in

# Check EC2 Security Group allows port 80/443
```

### Database connection errors
- Verify MongoDB Atlas IP whitelist includes EC2 IP
- Check DATABASE_URL in .env is correct
- Test connection: `npx prisma db push`

### SSL Certificate issues
```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

---

## 📞 Support

For issues related to:
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **MongoDB Atlas**: https://www.mongodb.com/docs/atlas/
- **PM2**: https://pm2.keymetrics.io/docs/

---

## 🎉 You're Done!

Your Troika Tech CRM is now live at: **https://crm.troikatech.in**

Remember to:
1. Register your first admin user
2. Update their role to 'SUPERADMIN' or 'ADMIN' in MongoDB if needed
3. Setup regular backups
4. Monitor application logs regularly
