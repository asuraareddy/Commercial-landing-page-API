import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import os from 'os';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || '';

  // 1. If user configured external PostgreSQL/Supabase DB URL in environment
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  // 2. Serverless / Production SQLite handler (Vercel & AWS Lambda compatible)
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    try {
      const tmpDir = os.tmpdir();
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const tmpDbPath = path.join(tmpDir, 'dev.db');

      // Copy seeded SQLite database to writable tmp directory if not present
      if (!fs.existsSync(tmpDbPath)) {
        const candidatePaths = [
          path.join(process.cwd(), 'prisma', 'dev.db'),
          path.join(process.cwd(), 'dev.db'),
        ];

        let copied = false;
        for (const srcPath of candidatePaths) {
          if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, tmpDbPath);
            console.log(`Successfully copied database from ${srcPath} to ${tmpDbPath}`);
            copied = true;
            break;
          }
        }

        if (!copied) {
          console.warn('Source dev.db not found in candidate paths, SQLite fallback will be created by Prisma.');
        }
      }

      if (fs.existsSync(tmpDbPath)) {
        return new PrismaClient({
          datasources: {
            db: {
              url: `file:${tmpDbPath}`,
            },
          },
          log: ['error'],
        });
      }
    } catch (err) {
      console.error('Failed to setup SQLite database in tmp:', err);
    }
  }

  // 3. Fallback for local development
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
