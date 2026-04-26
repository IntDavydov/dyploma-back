import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';

async function testDb() {
  try {
    const res = await db.select().from(users).limit(1);
    console.log("DB OK:", res);
  } catch (err: any) {
    console.error("DB ERROR FULL:", err);
  }
}

testDb();
