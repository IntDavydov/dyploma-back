import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { config } from 'dotenv';

// Load environment variables from .env
config({ path: '.env' }); 

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function main() {
  console.log('🚀 Running migrations...');
  try {
    // 'migrationsFolder' must point to where drizzle-kit generated your .sql files
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations successful');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
