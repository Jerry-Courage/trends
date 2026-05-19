import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./shared/schema";
import bcrypt from "bcryptjs";

const sqlite = new Database("sqlite_v2.db");
const db = drizzle(sqlite, { schema });

async function createStaffUsers() {
  const users = [
    { email: "chef@trends.ink", password: "trends-staff-2025", name: "Chef Trends", role: "kitchen" },
    { email: "rider@trends.ink", password: "trends-staff-2025", name: "Rider Trends", role: "rider" }
  ];

  for (const u of users) {
    const existing = await db.query.users.findFirst({
      where: (user, { eq }) => eq(user.email, u.email),
    });

    const passwordHash = await bcrypt.hash(u.password, 10);
    if (!existing) {
      await db.insert(schema.users).values({
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role as any,
        createdAt: new Date(),
      });
      console.log(`### Created ${u.role}: ${u.email} / ${u.password}`);
    } else {
      await db.update(schema.users).set({ passwordHash, role: u.role as any }).where({ id: existing.id });
      console.log(`### Updated ${u.role}: ${u.email} / ${u.password}`);
    }
  }
}

createStaffUsers().then(() => process.exit(0));
