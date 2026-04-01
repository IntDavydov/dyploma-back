🛠️ Backend Repository (The Engine)
Project Initialization

[ ] npm init -y and install the "Holy Trinity": express, drizzle-orm, pg [cite: 2025-09-13].

[ ] Install DevDeps: typescript, tsx, @types/node, @types/express, drizzle-kit, eslint, vitest [cite: 2025-09-13, 2025-10-30].

[ ] Create .nvmrc with version 20 [cite: 2025-09-13].

Configuration

[ ] Setup tsconfig.json (Target: ES2022, Module: NodeNext) [cite: 2025-10-30].

[ ] Setup .eslintrc.json for code quality [cite: 2025-10-30].

[ ] Setup drizzle.config.ts pointing to your Neo/Postgres URL [cite: 2025-10-30].

Database & Logic

[ ] Define schema.ts with products and orders tables [cite: 2025-09-13, 2025-10-30].

[ ] Run npx drizzle-kit push to sync with Neo/Postgres [cite: 2025-10-30].

[ ] Implement Service A: REST endpoints for CRUD on products [cite: 2025-10-30].

[ ] Implement Service B: A mock function/route for shipping rates (The SOA "Mock") [cite: 2025-10-30].

[ ] Add a basic Vitest unit test for the shipping calculation logic [cite: 2025-10-30].
