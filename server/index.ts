import "dotenv/config";
console.log("### SERVER_CHECKPOINT: Starting Trends Electronics Delivery App...");
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { db } from "./db";
import { menuItems, users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import routes from "./routes";
import cjRoutes from "./cj-routes";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const chatHistory = new Map<number, { id: string; senderRole: string; senderName: string; text: string; timestamp: number }[]>();

const PORT = Number(process.env.PORT) || Number(process.env.SERVER_PORT) || 3001;

app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static("public/uploads"));

app.get("/api/health", (_req, res) => res.json({ status: "healthy", timestamp: new Date().toISOString() }));

import fs from "fs";
import path from "path";
const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

io.on("connection", (socket) => {
  socket.on("join", (room: string) => socket.join(room));

  socket.on("join_order_tracking", ({ orderId }) => {
    socket.join(`order:${orderId}`);
  });

  socket.on("chat:join", ({ orderId }: { orderId: number }) => {
    socket.join(`order_chat:${orderId}`);
    const history = chatHistory.get(orderId) || [];
    socket.emit("chat:history", history);
  });

  socket.on("chat:send", ({ orderId, text, senderRole, senderName }: { orderId: number; text: string; senderRole: string; senderName: string }) => {
    if (!text?.trim()) return;
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      senderRole, senderName,
      text: text.trim(),
      timestamp: Date.now(),
    };
    if (!chatHistory.has(orderId)) chatHistory.set(orderId, []);
    const msgs = chatHistory.get(orderId)!;
    msgs.push(message);
    if (msgs.length > 100) msgs.splice(0, msgs.length - 100);
    io.to(`order_chat:${orderId}`).emit("chat:message", message);
  });

  socket.on("disconnect", () => {});
});

app.use("/api", routes);
app.use("/api/cj", cjRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === "production" || process.env.RENDER) {
  const distPath = path.resolve(process.cwd(), "dist");
  if (fs.existsSync(distPath)) {
    console.log(`### SERVER_CHECKPOINT: Serving static files from ${distPath}`);
    const assetsDir = path.join(distPath, "assets");
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir);
      console.log(`### SERVER_CHECKPOINT: Assets found: ${files.length} items`);
    }
  } else {
    console.error("### SERVER_ERROR: dist directory not found!");
  }

  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      if (req.path.includes(".")) return res.status(404).send("Not Found");
      return res.sendFile(path.resolve(distPath, "index.html"));
    }
    next();
  });
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("### GLOBAL ERROR ###", err);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

// ─── Seed Functions ───────────────────────────────────────────────────────────

async function seedSuperAdmin() {
  const email = "admin@trendselectronics.com";
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    await db.update(users).set({
      role: "admin",
      passwordHash: await bcrypt.hash("trends-admin-2025", 10),
    }).where(eq(users.id, existing[0].id));
    console.log(`### Admin account verified: ${email}`);
    return;
  }
  await db.insert(users).values({
    email,
    passwordHash: await bcrypt.hash("trends-admin-2025", 10),
    name: "Trends Admin",
    role: "admin",
    createdAt: new Date(),
  });
  console.log("Super Admin seeded: admin@trendselectronics.com / trends-admin-2025");
}

async function initializeDatabase() {
  console.log("### DB_CHECKPOINT: Running self-healing migrations...");
  try {
    // @ts-ignore
    const sqlite = db.session.client;

    const userCols = (sqlite.prepare("PRAGMA table_info(users)").all() as any[]).map((c: any) => c.name);
    if (!userCols.includes("points"))    sqlite.prepare("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0").run();
    if (!userCols.includes("google_id")) sqlite.prepare("ALTER TABLE users ADD COLUMN google_id TEXT").run();
    if (!userCols.includes("interests")) {
      if (userCols.includes("allergies")) {
        sqlite.prepare("ALTER TABLE users RENAME COLUMN allergies TO interests").run();
      } else {
        sqlite.prepare("ALTER TABLE users ADD COLUMN interests TEXT").run();
      }
    }

    const menuCols = (sqlite.prepare("PRAGMA table_info(menu_items)").all() as any[]).map((c: any) => c.name);
    if (!menuCols.includes("specs")) {
      if (menuCols.includes("calories")) {
        sqlite.prepare("ALTER TABLE menu_items RENAME COLUMN calories TO specs").run();
      } else {
        sqlite.prepare("ALTER TABLE menu_items ADD COLUMN specs TEXT").run();
      }
    }
    if (!menuCols.includes("cj_pid"))  sqlite.prepare("ALTER TABLE menu_items ADD COLUMN cj_pid TEXT").run();
    if (!menuCols.includes("cj_vid"))  sqlite.prepare("ALTER TABLE menu_items ADD COLUMN cj_vid TEXT").run();
    if (!menuCols.includes("cj_cost")) sqlite.prepare("ALTER TABLE menu_items ADD COLUMN cj_cost TEXT").run();

    const orderCols = (sqlite.prepare("PRAGMA table_info(orders)").all() as any[]).map((c: any) => c.name);
    if (!orderCols.includes("cj_order_id"))      sqlite.prepare("ALTER TABLE orders ADD COLUMN cj_order_id TEXT").run();
    if (!orderCols.includes("cj_order_num"))     sqlite.prepare("ALTER TABLE orders ADD COLUMN cj_order_num TEXT").run();
    if (!orderCols.includes("cj_tracking_no"))   sqlite.prepare("ALTER TABLE orders ADD COLUMN cj_tracking_no TEXT").run();
    if (!orderCols.includes("cj_logistic"))      sqlite.prepare("ALTER TABLE orders ADD COLUMN cj_logistic TEXT").run();
    if (!orderCols.includes("shipping_country")) sqlite.prepare("ALTER TABLE orders ADD COLUMN shipping_country TEXT").run();
    if (!orderCols.includes("currency"))         sqlite.prepare("ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT 'USD'").run();

    const favTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='favorites'").get();
    if (!favTable) {
      sqlite.prepare(`CREATE TABLE favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`).run();
    }

    console.log("### DB_CHECKPOINT: Database structure verified");
  } catch (err) {
    console.error("### DB_ERROR: Self-healing migration failed:", err);
  }
}

async function seedMenuItems() {
  // Use raw SQLite COUNT so that admin-deleted products don't trigger a re-seed.
  // The Drizzle select() only returns available items; COUNT(*) counts everything.
  // @ts-ignore
  const sqlite = db.session.client;
  const row = sqlite.prepare("SELECT COUNT(*) as cnt FROM menu_items").get() as { cnt: number };
  if (row.cnt > 0) {
    console.log(`### Skipping menu seed — ${row.cnt} product(s) already in database`);
    return;
  }

  await db.insert(menuItems).values([
    { name: "iPhone 15 Pro", description: "Titanium design, A17 Pro chip, Action button, and a more versatile Pro camera system", price: "999.00", imageUrl: "/assets/iphone-15.jpg", specs: "A17 Pro Chip, 48MP Camera, USB-C", tags: JSON.stringify(["Apple", "New"]), category: "Smartphones", rating: "4.9", reviews: 1200, isTop: 1, isAvailable: 1 },
    { name: "Samsung Galaxy S24 Ultra", description: "The ultimate Galaxy AI experience with a 200MP camera and built-in S Pen", price: "1299.00", imageUrl: "/assets/s24-ultra.jpg", specs: "Snapdragon 8 Gen 3, 200MP Zoom, S-Pen", tags: JSON.stringify(["Samsung", "AI"]), category: "Smartphones", rating: "4.8", reviews: 850, isTop: 1, isAvailable: 1 },
    { name: "MacBook Air M3", description: "Strikingly thin and fast, so you can work, play, or create anything — anywhere", price: "1099.00", imageUrl: "/assets/macbook-air.jpg", specs: "M3 Chip, 13.6\" Liquid Retina, 18hr Battery", tags: JSON.stringify(["Apple", "Laptop"]), category: "Laptops", rating: "4.9", reviews: 450, isTop: 1, isAvailable: 1 },
    { name: "Sony WH-1000XM5", description: "Industry-leading noise canceling headphones with exceptional sound quality", price: "399.00", imageUrl: "/assets/sony-xm5.jpg", specs: "30hr Battery, Multi-point Connection", tags: JSON.stringify(["Audio", "Noise Canceling"]), category: "Audio", rating: "4.7", reviews: 2100, isTop: 0, isAvailable: 1 },
    { name: "iPad Pro M4", description: "The thinnest Apple product ever, featuring the world's most advanced display", price: "999.00", imageUrl: "/assets/ipad-pro.jpg", specs: "M4 Chip, Tandem OLED, Ultra-thin", tags: JSON.stringify(["Apple", "Tablet"]), category: "Tablets", rating: "4.8", reviews: 300, isTop: 0, isAvailable: 1 },
    { name: "Home Entertainment Bundle", description: "Sony 65\" 4K TV + Soundbar + Subwoofer. Ultimate cinematic experience.", price: "1899.00", imageUrl: "/assets/tv-bundle.jpg", specs: "4K HDR, Dolby Atmos, Smart TV", category: "Bundles", isTop: 1, isAvailable: 1 },
    { name: "AirPods Pro (2nd Gen)", description: "MagSafe Charging Case (USB-C) and twice the noise cancellation", price: "249.00", imageUrl: "/assets/airpods-pro.jpg", specs: "H2 Chip, Adaptive Audio, USB-C", tags: JSON.stringify(["Apple", "Audio"]), category: "Audio", isTop: 0, isAvailable: 1 },
    { name: "Apple Watch Series 9", description: "Smarter, brighter, and mightier with the S9 SiP and double tap gesture", price: "399.00", imageUrl: "/assets/apple-watch.jpg", specs: "S9 SiP, Blood Oxygen, ECG", tags: JSON.stringify(["Apple", "Wearable"]), category: "Wearables", isTop: 0, isAvailable: 1 },
    { name: "Logitech MX Master 3S", description: "Performance wireless mouse with quiet clicks and 8K DPI tracking", price: "99.00", imageUrl: "/assets/mx-master.jpg", specs: "8000 DPI, Quiet Clicks, MagSpeed", tags: JSON.stringify(["Accessories", "Logitech"]), category: "Accessories", isTop: 0, isAvailable: 1 },
    { name: "Dell XPS 15", description: "Stunning 4K OLED display with high performance for creators", price: "1599.00", imageUrl: "/assets/dell-xps.jpg", specs: "i9 Processor, 32GB RAM, RTX 4060", tags: JSON.stringify(["Dell", "Laptop"]), category: "Laptops", isTop: 0, isAvailable: 1 },
  ]);
  console.log("### Menu items seeded (first run only)");
}

async function seedDemoCustomers() {
  const demos = [
    { email: "kwame.asante@gmail.com", name: "Kwame Asante" },
    { email: "abena.mensah@outlook.com", name: "Abena Mensah" },
    { email: "kofi.boateng@yahoo.com", name: "Kofi Boateng" },
    { email: "akosua.darko@gmail.com", name: "Akosua Darko" },
    { email: "yaw.owusu@gmail.com", name: "Yaw Owusu" },
  ];
  const passwordHash = await bcrypt.hash("customer2025", 10);
  for (const c of demos) {
    const [existing] = await db.select().from(users).where(eq(users.email, c.email));
    if (!existing) {
      await db.insert(users).values({
        email: c.email, passwordHash, name: c.name,
        role: "customer", phone: "+233 20 000 0000",
        address: "Accra, Ghana", createdAt: new Date(),
      });
    }
  }
}

// ─── Start Server ─────────────────────────────────────────────────────────────

console.log("### SERVER_CHECKPOINT: Attempting to listen on PORT:", PORT);

httpServer.listen(PORT, "0.0.0.0", async () => {
  console.log(`### SERVER_SUCCESS: Backend running on 0.0.0.0:${PORT}`);
  try {
    const aiKey = process.env.GEMINI_API_KEY;
    if (aiKey) console.log(`### AI_CHECK: Gemini key detected (...${aiKey.slice(-4)})`);
    else console.error("### AI_CHECK: No GEMINI_API_KEY found!");

    await initializeDatabase();
    await seedSuperAdmin();
    await seedMenuItems();
    await seedDemoCustomers();
    console.log("### SERVER_CHECKPOINT: Startup complete");
  } catch (err) {
    console.error("### SERVER_ERROR: Seed error:", err);
  }
});

process.on("uncaughtException", (err) => {
  console.error("### CRITICAL_ERROR: Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("### CRITICAL_ERROR: Unhandled Rejection:", reason);
  process.exit(1);
});

export { io };
