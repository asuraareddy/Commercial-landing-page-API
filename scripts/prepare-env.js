const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

console.log('Checking environment variables for Prisma build...');

if (!process.env.DATABASE_URL) {
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  if (!envContent.includes('DATABASE_URL=')) {
    envContent += '\nDATABASE_URL="file:./dev.db"\n';
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('Created default DATABASE_URL="file:./dev.db" in .env file.');
  }
}

if (!process.env.JWT_SECRET) {
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  if (!envContent.includes('JWT_SECRET=')) {
    envContent += '\nJWT_SECRET="wa-gateway-secure-jwt-secret-key-2026"\n';
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('Created default JWT_SECRET in .env file.');
  }
}

console.log('Environment preparation complete.');
