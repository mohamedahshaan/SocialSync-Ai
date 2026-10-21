import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_FILE = path.resolve(__dirname, '../../.pkce_cache.json');

/**
 * Persistent PKCE store that keeps verifiers in memory and backs them up
 * to disk so that server restarts (or nodemon reloads) do not lose
 * unexchanged PKCE code verifiers during OAuth handshakes.
 */
class PersistentPkceStore {
  constructor() {
    this.memory = new Map();
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf8');
        const data = JSON.parse(raw);
        const now = Date.now();
        for (const [key, item] of Object.entries(data)) {
          if (item && item.expiresAt > now && item.verifier) {
            this.memory.set(key, item.verifier);
          }
        }
      }
    } catch {
      // Ignore cache file load errors
    }
  }

  saveToDisk() {
    try {
      const now = Date.now();
      const obj = {};
      for (const [key, val] of this.memory.entries()) {
        obj[key] = { verifier: val, expiresAt: now + 20 * 60 * 1000 };
      }
      fs.writeFileSync(CACHE_FILE, JSON.stringify(obj), 'utf8');
    } catch {
      // Ignore cache file write errors
    }
  }

  set(state, verifier) {
    if (!state || !verifier) return;
    this.memory.set(state, verifier);
    this.saveToDisk();
    setTimeout(() => this.delete(state), 20 * 60 * 1000);
  }

  get(state) {
    if (!state) return null;
    if (this.memory.has(state)) {
      return this.memory.get(state);
    }
    this.loadFromDisk();
    return this.memory.get(state) || null;
  }

  delete(state) {
    if (!state) return;
    this.memory.delete(state);
    this.saveToDisk();
  }
}

export const persistentPkceStore = new PersistentPkceStore();
