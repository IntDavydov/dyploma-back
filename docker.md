🐳 Docker (The Containerization)

## 📦 Dockerfile
A multi-stage build using `node:20-alpine`:
- **Stage 1 (Builder):** Installs dev dependencies, copies source, and runs `npm run build`.
- **Stage 2 (Runner):** Lightweight image, installs only production dependencies, copies compiled code from Stage 1.

## 🚠 Docker Compose
Used to run the API container with environment variables from your `.env` file.

### Prerequisites
- Docker
- Docker Compose
- A `.env` file with a valid `DATABASE_URL` (e.g., your Neon DB URL).

### Commands

**1. Build and Start the API:**
```bash
docker-compose up --build
```

**2. Stop the API:**
```bash
docker-compose down
```

**3. Run Database Push (Schema Sync):**
Since you are using a hosted Neon DB, you should sync your schema from your local environment:
```bash
npm run db:push
```

## 🔐 Environment Variables
The `docker-compose.yml` automatically loads your `.env` file. Ensure `DATABASE_URL` is set to your Neon PostgreSQL connection string.
