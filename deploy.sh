#!/usr/bin/env bash
set -euo pipefail

# ERP Velocity deploy script (CentOS 7.9)
# - Frontend: Vite build -> served by Nginx
# - Backend: Node/Express on :3000 managed by PM2
#
# Usage on VPS:
#   export DOMAIN="erp.example.com"
#   export APP_DIR="/var/www/erp"
#   export API_PORT="3000"
#   ./deploy.sh

DOMAIN="${DOMAIN:-}"
APP_DIR="${APP_DIR:-/var/www/erp}"
API_PORT="${API_PORT:-3000}"

if [[ -z "$DOMAIN" ]]; then
  echo "Missing DOMAIN env. Example: DOMAIN=erp.example.com ./deploy.sh" >&2
  exit 1
fi

echo "==> Ensure base packages"
sudo yum -y install epel-release
sudo yum -y install git nginx

echo "==> Install Node.js 20 + PM2"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
  sudo yum -y install nodejs
fi
sudo npm i -g pm2

echo "==> Prepare app directory: $APP_DIR"
sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER":"$USER" "$APP_DIR"

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "==> Clone repo into $APP_DIR (set REPO_URL first)"
  if [[ -z "${REPO_URL:-}" ]]; then
    echo "Missing REPO_URL env. Example: REPO_URL=git@github.com:org/repo.git" >&2
    exit 1
  fi
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

echo "==> Pull latest"
git fetch --all --prune
git checkout "${BRANCH:-main}"
git pull --ff-only

echo "==> Backend install"
cd "$APP_DIR/backend"
npm ci || npm install

if [[ ! -f "$APP_DIR/backend/.env" ]]; then
  cat > "$APP_DIR/backend/.env" <<EOF
PORT=${API_PORT}
JWT_SECRET=CHANGE_ME
JWT_EXPIRES_IN=7d
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=erp
EOF
  echo "Created backend/.env (PLEASE EDIT JWT_SECRET + DB settings)"
fi

echo "==> Start backend with PM2"
pm2 start "$APP_DIR/backend/server.js" --name erp-backend --update-env
pm2 save
pm2 startup systemd -u "$USER" --hp "$HOME" | tail -n 1 | bash || true

echo "==> Frontend build"
cd "$APP_DIR"
npm ci || npm install
npm run build

echo "==> Deploy static files to /var/www/erp/frontend"
sudo mkdir -p /var/www/erp/frontend
sudo rsync -a --delete "$APP_DIR/dist/" /var/www/erp/frontend/

echo "==> Nginx config"
sudo mkdir -p /etc/nginx/conf.d
sudo tee /etc/nginx/conf.d/erp.conf >/dev/null <<EOF
server {
  listen 80;
  server_name ${DOMAIN};

  # Frontend
  root /var/www/erp/frontend;
  index index.html;

  # API
  location /api/ {
    proxy_pass http://127.0.0.1:${API_PORT}/api/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  # Uploads
  location /uploads/ {
    proxy_pass http://127.0.0.1:${API_PORT}/uploads/;
    proxy_set_header Host \$host;
  }

  # SPA fallback
  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF

sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

echo "==> SSL (Let's Encrypt)"
sudo yum -y install certbot python2-certbot-nginx || true
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "${LE_EMAIL:-admin@${DOMAIN}}" || true

echo "✅ Done. Open: http://${DOMAIN} (then https once certbot succeeds)"

