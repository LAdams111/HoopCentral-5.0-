const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { defineConfig } = require("drizzle-kit");

module.exports = defineConfig({
  schema: [
    "./src/db/schema/leagues.ts",
    "./src/db/schema/seasons.ts",
    "./src/db/schema/teams.ts",
    "./src/db/schema/players.ts",
  ],
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
