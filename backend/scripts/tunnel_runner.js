/**
 * SocialSync AI — Resilient PayHere Webhook Tunnel Runner with Auto-Configuration
 *
 * Keeps Cloudflare Tunnel active and healthy by:
 * 1. Spawning cloudflared quick tunnel to forward to port 5001
 * 2. Automatically parsing the live HTTPS URL (trycloudflare.com)
 * 3. Automatically synchronizing backend/.env PAYHERE_NOTIFY_URL
 * 4. Pinging /api/health periodically to ensure connectivity
 * 5. Re-establishing the tunnel automatically if dropped
 */

import { spawn } from 'child_process';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

const PORT = process.env.PORT || 5001;
let activeProcess = null;
let activeUrl = null;
let pingInterval = null;
let isShuttingDown = false;

function updateEnvFile(webhookUrl) {
  try {
    if (!fs.existsSync(envPath)) return;
    let envContent = fs.readFileSync(envPath, 'utf8');
    const notifyUrlLine = `PAYHERE_NOTIFY_URL=${webhookUrl}`;

    if (envContent.includes('PAYHERE_NOTIFY_URL=')) {
      envContent = envContent.replace(/PAYHERE_NOTIFY_URL=.*(\r?\n|$)/, `${notifyUrlLine}$1`);
    } else {
      envContent += `\n${notifyUrlLine}\n`;
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`[CONFIG_SYNC] Updated backend/.env with PAYHERE_NOTIFY_URL=${webhookUrl}`);
  } catch (err) {
    console.warn(`[CONFIG_SYNC_WARN] Could not update .env: ${err.message}`);
  }
}

function pingTunnel(url) {
  if (!url || isShuttingDown) return;
  const pingUrl = `${url}/api/health`;
  const req = https.get(pingUrl, { timeout: 8000 }, (res) => {
    if (res.statusCode === 200) {
      // Tunnel healthy
    } else {
      console.warn(`[TUNNEL_KEEPALIVE_WARN] Health check returned HTTP ${res.statusCode}`);
      if (res.statusCode === 502 || res.statusCode === 503 || res.statusCode === 404) {
        console.warn(`[TUNNEL_KEEPALIVE_RESTART] Upstream error. Restarting tunnel...`);
        restartTunnel();
      }
    }
  });

  req.on('error', (err) => {
    console.warn(`[TUNNEL_KEEPALIVE_ERROR] Ping failed: ${err.message}. Restarting tunnel...`);
    restartTunnel();
  });

  req.on('timeout', () => {
    req.destroy();
    console.warn(`[TUNNEL_KEEPALIVE_TIMEOUT] Ping timed out. Restarting tunnel...`);
    restartTunnel();
  });
}

function startTunnel() {
  if (isShuttingDown) return;
  console.log(`[TUNNEL] Launching Cloudflare Tunnel on port ${PORT}...`);

  activeProcess = spawn('npx', ['-y', 'cloudflared', 'tunnel', '--url', `http://localhost:${PORT}`], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const handleOutput = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && match[0] !== activeUrl) {
      activeUrl = match[0];
      const webhookUrl = `${activeUrl}/api/webhooks/payment`;

      console.log(`\n===========================================================`);
      console.log(`[TUNNEL_ACTIVE] Cloudflare Public Tunnel Active!`);
      console.log(`   Public Tunnel: ${activeUrl}`);
      console.log(`   Webhook URL:   ${webhookUrl}`);
      console.log(`===========================================================\n`);

      updateEnvFile(webhookUrl);

      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => pingTunnel(activeUrl), 20000);
      setTimeout(() => pingTunnel(activeUrl), 2500);
    }
  };

  activeProcess.stdout.on('data', handleOutput);
  activeProcess.stderr.on('data', handleOutput);

  activeProcess.on('close', (code) => {
    console.warn(`[TUNNEL_CLOSED] Tunnel process exited with code ${code}`);
    if (pingInterval) clearInterval(pingInterval);
    if (!isShuttingDown) {
      console.log('[TUNNEL_RETRY] Reconnecting Cloudflare tunnel in 3 seconds...');
      setTimeout(startTunnel, 3000);
    }
  });
}

function restartTunnel() {
  if (activeProcess) {
    try {
      activeProcess.kill();
    } catch {}
  }
}

process.on('SIGINT', () => {
  isShuttingDown = true;
  if (pingInterval) clearInterval(pingInterval);
  if (activeProcess) activeProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  isShuttingDown = true;
  if (pingInterval) clearInterval(pingInterval);
  if (activeProcess) activeProcess.kill();
  process.exit(0);
});

startTunnel();
