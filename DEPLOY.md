# Deploying The Latent Liturgy (eon.pablogfx.com)

Target: Ubuntu VPS, nginx in front of `next start` on port 3355.

## 1. One-time server setup

```bash
# Node 20+, ffmpeg (for scripts/media.sh), git
sudo apt-get install -y ffmpeg
# app user + directory
sudo mkdir -p /var/www/liturgy && sudo chown $USER /var/www/liturgy
git clone https://github.com/lazniak/tilde.git /var/www/liturgy
cd /var/www/liturgy
```

Environment (`/var/www/liturgy/.env.local`, mode 600):

```
OPENROUTER_API_KEY=sk-or-v1-…
SESSION_SECRET=<64 random hex chars>          # keeps anti-abuse tokens valid across restarts
SITE_URL=https://eon.pablogfx.com
# optional
OPENROUTER_MODEL=google/gemini-flash-latest
TESTIMONY_MODERATION=post                     # 'pre' = testimonies need approval
MOD_TOKEN=<random>                            # header x-mod-token for DELETE /api/community/testimony
LITURGY_DATA_DIR=/var/www/liturgy/data
```

Media is **not** in git. Upload the masters once (`public/eon/*.png`, `eon_*.mp4`, `STEAMS-music/*.wav`, `stage*.json`) then derive the web versions on the server:

```bash
bash scripts/media.sh          # -> public/eon/audio, thumbs, web, mobile (idempotent)
```

or rsync the derived folders from your workstation:

```bash
rsync -av public/eon/audio public/eon/thumbs public/eon/web public/eon/mobile user@72.61.80.71:/var/www/liturgy/public/eon/
rsync -av public/voice user@72.61.80.71:/var/www/liturgy/public/
```

## 2. Each deploy

```bash
cd /var/www/liturgy
git pull --ff-only
npm ci
npm run build
sudo systemctl restart liturgy
```

## 3. systemd unit (`/etc/systemd/system/liturgy.service`)

```ini
[Unit]
Description=The Latent Liturgy (Next.js)
After=network.target

[Service]
WorkingDirectory=/var/www/liturgy
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=PORT=3355
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

`data/` must be writable by `www-data` (testimonies, counters, confessions, heatmap cache).

## 4. nginx (security-relevant parts)

The rate limiter trusts `X-Real-IP` / `X-Forwarded-For`. nginx **must set them itself** (do not append the client-supplied header) or a client can spoof its way past the limits.

```nginx
server_tokens off;

map $http_upgrade $connection_upgrade { default upgrade; '' close; }

server {
    listen 443 ssl http2;
    server_name eon.pablogfx.com;
    # ssl_certificate … (certbot)

    client_max_body_size 128k;

    # Long cache for immutable media
    location ~ ^/(eon|voice)/ {
        proxy_pass http://127.0.0.1:3355;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # Streaming chat: no buffering
    location /api/chat {
        proxy_pass http://127.0.0.1:3355;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 120s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;      # overwrite, do not append
        proxy_set_header X-Forwarded-Proto https;
    }

    location / {
        proxy_pass http://127.0.0.1:3355;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }
}
server {
    listen 80;
    server_name eon.pablogfx.com;
    return 301 https://$host$request_uri;
}
```

Security headers (CSP, HSTS, nosniff, frame-ancestors) are set by Next itself in `next.config.js`; nginx only needs `server_tokens off`.

Optional extra layer: put Cloudflare (proxied DNS) in front and enable "Bot Fight Mode". Then set `X-Forwarded-For` from `$http_cf_connecting_ip` instead.

## 5. Generating translations and voice

Both run on your workstation, outputs are committed (`app/locales/*.json`, `app/features/*/i18n/*.json`, `public/voice/**`):

```bash
node scripts/translate.mjs            # OpenRouter, ~30 locales, only missing keys
node scripts/voiceover.mjs            # ElevenLabs v3, voice q2Jflwxxc8OoEk4kjqyg, nav segments
node scripts/voiceover.mjs --statement --lang pl,en   # the long artist's statement
```

## 6. Health checks

- `curl -I https://eon.pablogfx.com` → `content-security-policy`, `strict-transport-security` present, no `x-powered-by`.
- `curl -s https://eon.pablogfx.com/api/session` → `{"token":"…"}`.
- Chat without a token → 401; 6 quick chats → 429.
- Phone: ENTER must load in < 5 s on LTE (stems are ~3 MB each, streamed).
