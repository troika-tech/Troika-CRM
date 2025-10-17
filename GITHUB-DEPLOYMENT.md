# GitHub-Based Deployment Guide
## Troika Tech CRM - Continuous Deployment

---

## 🚀 Quick Update from GitHub

To deploy updates from GitHub to your EC2 server:

```bash
ssh -i your-key.pem ubuntu@43.204.230.183
cd /var/www/troika-crm
./update-from-github.sh
```

That's it! The script will:
1. Pull latest changes from GitHub
2. Install dependencies
3. Build the application
4. Restart PM2

---

## 📋 GitHub Repository Setup

**Repository**: https://github.com/troika-tech/Troika-CRM.git
- **Branch**: main
- **Visibility**: Private (recommended)

---

## 🔄 Deployment Workflow

### Option 1: Automated Update (Recommended)

1. **Make changes locally** and commit:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. **SSH into EC2** and run update script:
   ```bash
   ssh -i your-key.pem ubuntu@43.204.230.183
   cd /var/www/troika-crm
   ./update-from-github.sh
   ```

### Option 2: Manual Update

1. **SSH into EC2**:
   ```bash
   ssh -i your-key.pem ubuntu@43.204.230.183
   cd /var/www/troika-crm
   ```

2. **Pull changes**:
   ```bash
   git pull origin main
   ```

3. **Install dependencies** (if package.json changed):
   ```bash
   npm ci
   ```

4. **Build application**:
   ```bash
   npm run build
   ```

5. **Restart PM2**:
   ```bash
   pm2 restart troika-crm
   ```

---

## 👤 Superadmin Credentials

**Email**: `9664009535@troika`
**Password**: `B_LR8$i3_R-8!+.>$D8U785Rajr21`
**Role**: SUPERADMIN
**Status**: ACTIVE

Access your CRM at: **https://crm.troikatech.in**

---

## 🔐 Security Checklist

- [x] GitHub repository is private
- [x] `.env` files are in `.gitignore`
- [x] Superadmin user created with strong password
- [x] EC2 IP whitelisted in MongoDB Atlas (43.204.230.183)
- [x] SSL certificate installed (expires: Jan 15, 2026)
- [x] PM2 auto-restart enabled

---

## 📁 Important Files

- `update-from-github.sh` - Automated deployment script
- `add-superadmin.js` - Script to add/update superadmin users
- `ecosystem.config.js` - PM2 configuration
- `nginx.conf` - Nginx reverse proxy configuration
- `.env` - Production environment variables (on EC2 only)

---

## 🛠️ Common Tasks

### Add a New Admin User

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@43.204.230.183
cd /var/www/troika-crm

# Edit the add-superadmin.js file with new credentials
# Then run:
node add-superadmin.js
```

### View Application Logs

```bash
pm2 logs troika-crm
```

### Check Application Status

```bash
pm2 status
```

### Restart Application

```bash
pm2 restart troika-crm
```

### View Nginx Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Renew SSL Certificate

Certificates auto-renew via certbot. To manually renew:

```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## 🔧 MongoDB Atlas Configuration

**Database**: MongoDB Atlas
**Connection**: Already configured in `.env`
**IP Whitelist**: 43.204.230.183 (EC2 IP)

To add more IPs:
1. Go to MongoDB Atlas Dashboard
2. Network Access → Add IP Address
3. Enter IP and confirm

---

## 📝 Development Workflow

### Local Development

1. **Clone repository**:
   ```bash
   git clone https://github.com/troika-tech/Troika-CRM.git
   cd Troika-CRM
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Setup local environment**:
   ```bash
   cp env.example .env
   # Edit .env with your local settings
   ```

4. **Generate Prisma client**:
   ```bash
   npx prisma generate
   ```

5. **Run development server**:
   ```bash
   npm run dev
   ```

### Making Changes

1. **Create a new branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. **Push to GitHub**:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request** on GitHub

5. **Merge to main** after review

6. **Deploy to production** using update script

---

## 🚨 Troubleshooting

### Application won't start after update

```bash
# Check logs
pm2 logs troika-crm

# Check if port 3000 is in use
sudo lsof -i :3000

# Restart PM2
pm2 restart troika-crm
```

### Build fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm ci
npm run build
```

### Database connection errors

- Check MongoDB Atlas IP whitelist includes EC2 IP
- Verify DATABASE_URL in `.env` is correct
- Test connection: `npx prisma db push`

### Git conflicts

```bash
# Stash local changes
git stash

# Pull latest
git pull origin main

# Reapply changes
git stash pop
```

---

## 📊 Monitoring

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Check memory/CPU usage
pm2 list
```

### Nginx Status

```bash
# Check if Nginx is running
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx
```

---

## 🔄 Rollback Procedure

If deployment fails, rollback to previous version:

```bash
cd /var/www/troika-crm

# View commit history
git log --oneline

# Rollback to previous commit
git reset --hard <commit-hash>

# Rebuild
npm run build

# Restart
pm2 restart troika-crm
```

---

## 📞 Support Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **PM2 Docs**: https://pm2.keymetrics.io/docs/
- **Nginx Docs**: https://nginx.org/en/docs/

---

## ✅ Deployment Checklist

Before each deployment:

- [ ] Test changes locally
- [ ] Commit and push to GitHub
- [ ] SSH into EC2
- [ ] Run update script or manual deployment
- [ ] Check PM2 status
- [ ] Test application in browser
- [ ] Monitor logs for errors

---

**Last Updated**: October 17, 2025
**Application URL**: https://crm.troikatech.in
**GitHub**: https://github.com/troika-tech/Troika-CRM.git
