// Loads server/.env for local development. Imported first in index.js so every module sees the variables.
// On Render the variables come from the dashboard and there is no .env file, which is fine.
try { process.loadEnvFile?.(new URL('./.env', import.meta.url)); } catch { /* no .env file */ }
