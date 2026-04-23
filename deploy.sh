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

# Step 1: Create deployment package (source code, build on server)
echo "[1/4] Creating deployment package..."
cd "$PROJECT_DIR"
tar czf /tmp/task-tracker-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='.env.local' \
    .

echo "  Package size: $(du -h /tmp/task-tracker-deploy.tar.gz | cut -f1)"

# Step 2: Upload .env.local separately
echo "[2/4] Uploading to EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "mkdir -p $REMOTE_DIR"
scp -i "$EC2_KEY" /tmp/task-tracker-deploy.tar.gz "$EC2_USER@$EC2_HOST:/tmp/"
scp -i "$EC2_KEY" "$PROJECT_DIR/.env.local" "$EC2_USER@$EC2_HOST:$REMOTE_DIR/.env.local"

# Step 3: Setup on EC2
echo "[3/4] Setting up on EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'REMOTE_SCRIPT'
set -e
REMOTE_DIR="/home/$USER/task-tracker"

# Extract source
cd "$REMOTE_DIR"
tar xzf /tmp/task-tracker-deploy.tar.gz
rm /tmp/task-tracker-deploy.tar.gz

# Install Node.js 20 if not present
if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 18 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "  Node: $(node -v)  npm: $(npm -v)"

# Install all deps and build
npm install
npm run build

# Create systemd service (port 3001 to avoid conflict)
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
ExecStart=$(which npx) next start -p 3001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Add nginx server block for task-tracker.bobmanai.com
# SEPARATE server block — does NOT touch existing configs
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

sleep 2
echo ""
echo "═══════════════════════════════════════════"
echo "  Task Tracker deployed!"
echo "  Running on port 3001 (systemd)"
echo "  Status: $(systemctl is-active task-tracker)"
echo "═══════════════════════════════════════════"
REMOTE_SCRIPT

# Step 4: Done
echo ""
echo "[4/4] Deployment complete!"
echo ""
echo "  DNS: Add A record  task-tracker.bobmanai.com → $(ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "curl -s ifconfig.me")"
echo "  URL: http://task-tracker.bobmanai.com"
echo ""
echo "  (Optional) Add SSL:"
echo "  ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'sudo certbot --nginx -d task-tracker.bobmanai.com'"
