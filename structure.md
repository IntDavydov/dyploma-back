## Theme

Давидов Артем Віталійович 13.Реалізація SOAP та REST API з використанням React в сервіс-орієнтованих системах.

## Tech Stack

UI design: google ai

Front: React + Next JS + Tailwind css
Back: Node + Express + Neo(Postgress)
Cloud: GCP + Docker
TS + Vitest + Playwright
CI/CD: Github actions

## Tasks

- [] create two repos

### Frontend repo

- [] Initialize with Next JS starter + Tailwind
- [] Design few pages with google ai
- [] Implement raw pages

### Backend repo

- [] Initialize with Express
  - [] Install deps
    - [] TS
    - [] tsx
    - [] types
    - [] eslint
    - [] vitest
    - [] drizzle
  - [] Configure
    - [] Ts config
    - [] eslint config
- [] Write basic API
  - []

## 📦 The Idea: "Global Shop-Sync Gateway"

You are building a dashboard for a store owner who needs to see products and orders from two different "Services"
(simulated as two different modules in your Express backend) [cite: 2025-10-30].

### The "SOA" Logic for your Defense:

- Service A (Internal): Manages local inventory stored in your Postgres (Neo) database [cite: 2025-09-13].
- Service B (External Simulation): A mock service that provides "Global Shipping Rates."

- The Flex: You tell the committee:
  "The system uses a Provider Pattern. Currently, it's REST, but the Interface is ready to swap to SOAP for legacy enterprise carriers if needed" [cite: 2025-09-13].

## 🛠️ The "Speed-Run" Technical Plan

### Backend (Express + Drizzle + Postgres)

- Schema: Two tables: Products (id, name, price, stock) and Orders (id, product_id, status) [cite: 2025-09-13].
- The "Mock" Service: Create a simple function that returns a random shipping price. This is your "External Service" [cite: 2025-10-30].
- Docker: One Dockerfile for the app and a docker-compose.yml to spin up Postgres. This satisfies your "Cloud/Docker" task immediately [cite: 2025-10-30].

### Frontend (Next.js + Tailwind)

- Page 1 (Inventory): A table showing products fetched from your API [cite: 2025-09-13].
- Page 2 (Order Stats): A quick dashboard using Tailwind grids to show "Total Sales" [cite: 2025-10-30].
- Google AI: Use it to generate a "Professional Admin Dashboard" layout so you don't waste time on CSS [cite: 2025-09-13].
