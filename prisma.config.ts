// Load env vars from .env.local (Next.js convention) so the Prisma CLI
// (migrate / generate / studio) reads the same DATABASE_URL the app uses.
import { config } from "dotenv";
config({ path: ".env.local" });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Prisma 7: the connection URL lives here (used by migrate/db commands).
  // The app's runtime client connects via a driver adapter (see src/lib/prisma.ts).
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
