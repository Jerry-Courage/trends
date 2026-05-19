import { defineConfig } from "drizzle-kit";

import fs from "fs";
import path from "path";

const renderDiskPath = "/data";
const isRenderDisk = fs.existsSync(renderDiskPath);
const dbUrl = isRenderDisk 
  ? path.join(renderDiskPath, "sqlite_v2.db") 
  : "sqlite_v2.db";

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: dbUrl,
  },
});
