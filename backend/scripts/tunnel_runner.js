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

let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;

function pingTunnel(url) {
  if (!url || isShuttingDown) return;
  const pingUrl = `${url}/api/health`;
  const req = https.get(pingUrl, { timeout: 15000 }, (res) => {
    res.resume();
    if (res.statusCode === 200) {
      consecutiveFailures = 0;
    } else {
      consecutiveFailures++;
      console.warn(`[TUNNEL_HEALTH] Health ping returned HTTP ${res.statusCode} (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.warn(`[TUNNEL_RESTART] ${MAX_CONSECUTIVE_FAILURES} consecutive failures. Restarting tunnel...`);
        restartTunnel();
      }
    }
  });

  req.on('error', (err) => {
    consecutiveFailures++;
    console.warn(`[TUNNEL_HEALTH_NOTICE] Ping notice: ${err.message} (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn(`[TUNNEL_RESTART] ${MAX_CONSECUTIVE_FAILURES} consecutive errors. Restarting tunnel...`);
      restartTunnel();
    }
  });

  req.on('timeout', () => {
    req.destroy();
    consecutiveFailures++;
    console.warn(`[TUNNEL_HEALTH_NOTICE] Ping timeout (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn(`[TUNNEL_RESTART] ${MAX_CONSECUTIVE_FAILURES} consecutive timeouts. Restarting tunnel...`);
      restartTunnel();
    }
  });
}

function startTunnel() {
  if (isShuttingDown) return;
  consecutiveFailures = 0;
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
      pingInterval = setInterval(() => pingTunnel(activeUrl), 30000);
      setTimeout(() => pingTunnel(activeUrl), 20000);
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

function cleanupEnvFile() {
  try {
    if (!fs.existsSync(envPath)) return;
    let envContent = fs.readFileSync(envPath, 'utf8');
    const localNotifyUrl = `PAYHERE_NOTIFY_URL=http://localhost:${PORT}/api/webhooks/payment`;
    if (envContent.includes('PAYHERE_NOTIFY_URL=')) {
      envContent = envContent.replace(/PAYHERE_NOTIFY_URL=.*(\r?\n|$)/, `${localNotifyUrl}$1`);
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`[CONFIG_CLEANUP] Reset backend/.env to ${localNotifyUrl}`);
    }
  } catch (err) {
    console.warn(`[CONFIG_CLEANUP_WARN] Could not reset .env: ${err.message}`);
  }
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
  cleanupEnvFile();
  process.exit(0);
});

process.on('SIGTERM', () => {
  isShuttingDown = true;
  if (pingInterval) clearInterval(pingInterval);
  if (activeProcess) activeProcess.kill();
  cleanupEnvFile();
  process.exit(0);
});

startTunnel();
