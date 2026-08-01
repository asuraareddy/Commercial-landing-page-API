import { PrismaClient } from '@prisma/client';
import path from 'path';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || '';

  // 1. External PostgreSQL/Supabase DB URL
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  // 2. Persistent SQLite Database file in project directory (prisma/dev.db)
  const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
  const sqliteUrl = `file:${dbPath}`;

  return new PrismaClient({
    datasources: {
      db: {
        url: sqliteUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
