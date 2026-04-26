#!/bin/bash

# Load environment variables from the parent directory's .env file if it exists
if [ -f "../.env" ]; then
  export $(grep -v '^#' ../.env | xargs)
fi

echo "Testing connection to Neon DB..."

node -e '
require("dotenv").config({ path: "../.env" });
const { neon } = require("@neondatabase/serverless");

if (!process.env.DATABASE_URL) {
  console.error("\n❌ ERROR: DATABASE_URL is not set in the .env file.");
  process.exit(1);
}

console.log("Using DATABASE_URL:", process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@")); // Mask password for safety

const sql = neon(process.env.DATABASE_URL);

sql`SELECT 1 as connected`
  .then(res => {
    console.log("\n✅ DB CONNECTION SUCCESS: You are connected to Neon!");
  })
  .catch(err => {
    console.error("\n❌ DB CONNECTION FAILED:", err.message);
    console.error("Please check the password in your DATABASE_URL.");
  });
'
