/**
 * WA Gateway — Pre-build environment validation script.
 *
 * Verifies required environment variables are present before build.
 * NEVER injects SQLite fallbacks or placeholder values.
 */

const fs = require('fs');
const path = require('path');

// Load .env file manually if not already in process.env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const rawVal = trimmed.substring(eqIdx + 1).trim();
    // Strip surrounding quotes
    const value = rawVal.replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const REQUIRED_VARS = ['DATABASE_URL', 'DIRECT_URL', 'JWT_SECRET'];

let allPresent = true;

for (const varName of REQUIRED_VARS) {
  const value = process.env[varName];
  if (!value) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    allPresent = false;
  }
}

if (!allPresent) {
  console.error('');
  console.error('Please set the above environment variables in:');
  console.error('  - .env file (for local development)');
  console.error('  - Vercel Dashboard > Project > Settings > Environment Variables (for production)');
  console.error('');
  process.exit(1);
}

console.log('✅ All required environment variables are present. Proceeding with build...');
