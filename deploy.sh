#!/bin/bash
# ─── Task Tracker - EC2 Deployment Script ───
#
# Deploys alongside the existing video-annotation app on the same EC2.
# Does NOT touch the existing nginx config for video-annotation.
#
# Usage:
#   chmod +x deploy.sh && ./deploy.sh

# ═══════════════════════════════════════════════
EC2_HOST="ec2-3-111-149-191.ap-south-1.compute.amazonaws.com"
EC2_USER="ubuntu"
EC2_KEY="~/Downloads/BOBMAN.pem"
# ═══════════════════════════════════════════════

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
REMOTE_DIR="/home/$EC2_USER/task-tracker"

echo "═══════════════════════════════════════════"
echo "  Task Tracker - EC2 Deploy"
echo "═══════════════════════════════════════════"

# Step 1: Build locally
echo "[1/4] Building Next.js app..."
cd "$PROJECT_DIR"
npm run build

# Step 2: Create deployment package
echo "[2/4] Creating deployment package..."
tar czf /tmp/task-tracker-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.next/cache' \
    --exclude='.git' \
    --exclude='.env.local' \
    .next/ \
    public/ \
    package.json \
    package-lock.json \
    next.config.js \
    .env.example 2>/dev/null

echo "  Package size: $(du -h /tmp/task-tracker-deploy.tar.gz | cut -f1)"

# Step 3: Upload to EC2
echo "[3/4] Uploading to EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "mkdir -p $REMOTE_DIR"
scp -i "$EC2_KEY" /tmp/task-tracker-deploy.tar.gz "$EC2_USER@$EC2_HOST:/tmp/"

# Step 4: Setup on EC2
echo "[4/4] Setting up on EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'REMOTE_SCRIPT'
set -e
REMOTE_DIR="/home/$USER/task-tracker"

# Extract
cd "$REMOTE_DIR"
tar xzf /tmp/task-tracker-deploy.tar.gz
rm /tmp/task-tracker-deploy.tar.gz

# Install Node.js 20 if not present
if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 18 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install production deps
npm install --production

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "⚠️  WARNING: .env.local not found on server!"
    echo "   Copy .env.example to .env.local and fill in your credentials:"
    echo "   nano $REMOTE_DIR/.env.local"
fi

# Create systemd service (runs on port 3001 to avoid conflict with existing apps)
sudo tee /etc/systemd/system/task-tracker.service > /dev/null << EOF
[Unit]
Description=Task Tracker (Next.js)
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$REMOTE_DIR
EnvironmentFile=$REMOTE_DIR/.env.local
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=$(which node) $REMOTE_DIR/.next/standalone/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Add nginx server block for task-tracker.bobmanai.com
# This is a SEPARATE server block — does NOT touch existing configs
sudo tee /etc/nginx/sites-available/task-tracker > /dev/null << 'EOF'
server {
    listen 80;
    server_name task-tracker.bobmanai.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/task-tracker /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Start service
sudo systemctl daemon-reload
sudo systemctl enable task-tracker
sudo systemctl restart task-tracker

echo ""
echo "═══════════════════════════════════════════"
echo "  Task Tracker deployed!"
echo "  Running on port 3001 (systemd)"
echo "  Nginx proxy: task-tracker.bobmanai.com"
echo "═══════════════════════════════════════════"
echo ""
echo "  Next steps:"
echo "  1. Add DNS A record: task-tracker.bobmanai.com → $(curl -s ifconfig.me)"
echo "  2. Copy .env.local to server: scp .env.local ubuntu@$HOSTNAME:$REMOTE_DIR/"
echo "  3. (Optional) Add SSL: sudo certbot --nginx -d task-tracker.bobmanai.com"
echo ""
REMOTE_SCRIPT

echo ""
echo "Done! Add a DNS A record for task-tracker.bobmanai.com"
echo "pointing to the EC2 public IP."
