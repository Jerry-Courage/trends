import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../shared/schema";
import path from "path";

// On Render free tier there's no persistent disk — DB lives in the project root
import fs from "fs";

// Use persistent disk path on Render if available, otherwise fallback to local root
const renderDiskPath = "/data";
const isRenderDisk = fs.existsSync(renderDiskPath);

const dbPath = isRenderDisk 
  ? path.join(renderDiskPath, "sqlite_v2.db") 
  : path.resolve(process.cwd(), "sqlite_v2.db");

console.log("### DB_CHECKPOINT: Initializing database at", dbPath);

// Programmatically run drizzle-kit push before establishing database connection to ensure self-healing schemas
try {
  console.log("### DB_CHECKPOINT: Running drizzle-kit push programmatically...");
  const execSync = require("child_process").execSync;
  execSync("npx drizzle-kit push", { stdio: "inherit" });
  console.log("### DB_CHECKPOINT: drizzle-kit push completed successfully");
} catch (err: any) {
  console.error("### DB_ERROR: Programmatic drizzle-kit push failed:", err.message || err);
}

let sqlite;
try {
  sqlite = new Database(dbPath);
  console.log("### DB_CHECKPOINT: Database connection established");
} catch (err) {
  console.error("### DB_ERROR: Failed to connect to database:", err);
  process.exit(1);
}

export const db = drizzle(sqlite, { schema });
