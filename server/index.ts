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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// In-memory chat history keyed by orderId (max 100 messages per order)
const chatHistory = new Map<number, { id: string; senderRole: string; senderName: string; text: string; timestamp: number }[]>();

const PORT = Number(process.env.PORT) || Number(process.env.SERVER_PORT) || 3001;

app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static("public/uploads"));

// Simple health check endpoint for the container orchestration
app.get("/api/health", (_req, res) => res.json({ status: "healthy", timestamp: new Date().toISOString() }));

import fs from "fs";
import path from "path";
const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  console.log("### SERVER_CHECKPOINT: Creating uploads directory...");
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup Socket.io rooms and basic events
io.on("connection", (socket) => {
  socket.on("join", (room: string) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  socket.on("join_order_tracking", ({ orderId }) => {
    const room = `order:${orderId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined tracking room: ${room}`);
  });

  // Chat: join a chat room and receive message history
  socket.on("chat:join", ({ orderId }: { orderId: number }) => {
    const room = `order_chat:${orderId}`;
    socket.join(room);
    const history = chatHistory.get(orderId) || [];
    socket.emit("chat:history", history);
  });

  // Chat: receive a message and broadcast to the chat room
  socket.on("chat:send", ({ orderId, text, senderRole, senderName }: { orderId: number; text: string; senderRole: string; senderName: string }) => {
    if (!text || !text.trim()) return;
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      senderRole,
      senderName,
      text: text.trim(),
      timestamp: Date.now(),
    };
    if (!chatHistory.has(orderId)) chatHistory.set(orderId, []);
    const msgs = chatHistory.get(orderId)!;
    msgs.push(message);
    if (msgs.length > 100) msgs.splice(0, msgs.length - 100);
    io.to(`order_chat:${orderId}`).emit("chat:message", message);
  });

  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnected`);
  });
});

app.use("/api", routes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Serve frontend in production
if (process.env.NODE_ENV === "production" || process.env.RENDER) {
  const distPath = path.resolve(process.cwd(), "dist");
  
  if (fs.existsSync(distPath)) {
    console.log(`### SERVER_CHECKPOINT: Serving static files from ${distPath}`);
    const assetsDir = path.join(distPath, "assets");
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir);
      console.log(`### SERVER_CHECKPOINT: Assets found: ${files.length} items`);
      console.log(`### SERVER_CHECKPOINT: Main Asset: ${files.find(f => f.startsWith("index-") && f.endsWith(".js"))}`);
    } else {
      console.warn("### SERVER_ERROR: assets directory not found in dist!");
    }
  } else {
    console.error("### SERVER_ERROR: dist directory not found! Frontend build might have failed.");
  }

  app.use(express.static(distPath));
  
  // Custom SPA Fallback with strict asset protection
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      // If it looks like a file (has an extension), return 404 if not found by express.static
      if (req.path.includes(".")) {
        return res.status(404).send("Not Found");
      }
      // Otherwise, serve index.html for SPA routing
      return res.sendFile(path.resolve(distPath, "index.html"));
    }
    next();
  });
}

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("### GLOBAL ERROR ###", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Internal Server Error",
    status
  });
});

async function seedSuperAdmin() {
  const email = "admin@trendselectronics.com";
  const existing = await db.select().from(users).where(eq(users.email, email));
  
  if (existing.length > 0) {
    const user = existing[0];
    const passwordHash = await bcrypt.hash("trends-admin-2025", 10);
    console.log(`### Updating existing admin account: ${email}`);
    await db.update(users).set({ 
      role: "admin",
      passwordHash: passwordHash
    }).where(eq(users.id, user.id));
    return;
  }

  const passwordHash = await bcrypt.hash("trends-admin-2025", 10);
  await db.insert(users).values({
    email,
    passwordHash,
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

    // 1. Check/Add columns to users table
    const userTableInfo = sqlite.prepare("PRAGMA table_info(users)").all() as any[];
    const userColumns = userTableInfo.map((c) => c.name);

    if (!userColumns.includes("points")) {
      sqlite.prepare("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0").run();
    }
    if (!userColumns.includes("interests")) {
      // If allergies exists but interests doesn't, we can try to rename or just add
      if (userColumns.includes("allergies")) {
        sqlite.prepare("ALTER TABLE users RENAME COLUMN allergies TO interests").run();
      } else {
        sqlite.prepare("ALTER TABLE users ADD COLUMN interests TEXT").run();
      }
    }
    if (!userColumns.includes("google_id")) {
      sqlite.prepare("ALTER TABLE users ADD COLUMN google_id TEXT").run();
    }

    // 2. Check/Add columns to menu_items table
    const menuTableInfo = sqlite.prepare("PRAGMA table_info(menu_items)").all() as any[];
    const menuColumns = menuTableInfo.map((c) => c.name);

    if (!menuColumns.includes("specs")) {
      if (menuColumns.includes("calories")) {
        sqlite.prepare("ALTER TABLE menu_items RENAME COLUMN calories TO specs").run();
        sqlite.prepare("UPDATE menu_items SET specs = CAST(specs AS TEXT)").run(); // Convert type if needed
      } else {
        sqlite.prepare("ALTER TABLE menu_items ADD COLUMN specs TEXT").run();
      }
    }

    // 3. Check/Create favorites table
    const favoritesTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='favorites'").get();
    if (!favoritesTable) {
      sqlite.prepare(`
        CREATE TABLE favorites (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id),
          menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    }
    
    console.log("### DB_CHECKPOINT: Database structure verified");
  } catch (err) {
    console.error("### DB_ERROR: Self-healing migration failed:", err);
  }
}

async function seedStaffAccounts() {
  const staff = [
    { email: "support@trendselectronics.com", name: "Trends Support", role: "warehouse" as const },
    { email: "delivery@trendselectronics.com", name: "Trends Courier", role: "courier" as const }
  ];

  const passwordHash = await bcrypt.hash("trends-staff-2025", 10);
  for (const s of staff) {
    const [existing] = await db.select().from(users).where(eq(users.email, s.email));
    if (!existing) {
      await db.insert(users).values({
        email: s.email,
        passwordHash,
        name: s.name,
        role: s.role,
        createdAt: new Date(),
      });
      console.log(`Staff seeded: ${s.email}`);
    }
  }
}

async function seedMenuItems() {
  const existing = await db.select().from(menuItems);
  if (existing.length > 0) return;

  await db.insert(menuItems).values([
    { name: "iPhone 15 Pro", description: "Titanium design, A17 Pro chip, Action button, and a more versatile Pro camera system", price: "999.00", imageUrl: "/assets/iphone-15.jpg", specs: "A17 Pro Chip, 48MP Camera, USB-C", tags: JSON.stringify(["Apple", "New"]), category: "Smartphones", rating: "4.9", reviews: 1200, isTop: 1, isAvailable: 1 },
    { name: "Samsung Galaxy S24 Ultra", description: "The ultimate Galaxy AI experience with a 200MP camera and built-in S Pen", price: "1299.00", imageUrl: "/assets/s24-ultra.jpg", specs: "Snapdragon 8 Gen 3, 200MP Zoom, S-Pen", tags: JSON.stringify(["Samsung", "AI"]), category: "Smartphones", rating: "4.8", reviews: 850, isTop: 1, isAvailable: 1 },
    { name: "MacBook Air M3", description: "Strikingly thin and fast, so you can work, play, or create anything — anywhere", price: "1099.00", imageUrl: "/assets/macbook-air.jpg", specs: "M3 Chip, 13.6\" Liquid Retina, 18hr Battery", tags: JSON.stringify(["Apple", "Laptop"]), category: "Laptops", rating: "4.9", reviews: 450, isTop: 1, isAvailable: 1 },
    { name: "Sony WH-1000XM5", description: "Industry-leading noise canceling headphones with exceptional sound quality", price: "399.00", imageUrl: "/assets/sony-xm5.jpg", specs: "30hr Battery, Multi-point Connection", tags: JSON.stringify(["Audio", "Noise Canceling"]), category: "Audio", rating: "4.7", reviews: 2100, isTop: 0, isAvailable: 1 },
    { name: "iPad Pro M4", description: "The thinnest Apple product ever, featuring the world’s most advanced display", price: "999.00", imageUrl: "/assets/ipad-pro.jpg", specs: "M4 Chip, Tandem OLED, Ultra-thin", tags: JSON.stringify(["Apple", "Tablet"]), category: "Tablets", rating: "4.8", reviews: 300, isTop: 0, isAvailable: 1 },
    { name: "Home Entertainment Bundle", description: "Sony 65\" 4K TV + Soundbar + Subwoofer. Ultimate cinematic experience.", price: "1899.00", imageUrl: "/assets/tv-bundle.jpg", specs: "4K HDR, Dolby Atmos, Smart TV", category: "Bundles", isTop: 1, isAvailable: 1 },
    { name: "AirPods Pro (2nd Gen)", description: "MagSafe Charging Case (USB-C) and twice the noise cancellation", price: "249.00", imageUrl: "/assets/airpods-pro.jpg", specs: "H2 Chip, Adaptive Audio, USB-C", tags: JSON.stringify(["Apple", "Audio"]), category: "Audio", isTop: 0, isAvailable: 1 },
    { name: "Apple Watch Series 9", description: "Smarter, brighter, and mightier with the S9 SiP and double tap gesture", price: "399.00", imageUrl: "/assets/apple-watch.jpg", specs: "S9 SiP, Blood Oxygen, ECG", tags: JSON.stringify(["Apple", "Wearable"]), category: "Wearables", isTop: 0, isAvailable: 1 },
    { name: "Logitech MX Master 3S", description: "Performance wireless mouse with quiet clicks and 8K DPI tracking", price: "99.00", imageUrl: "/assets/mx-master.jpg", specs: "8000 DPI, Quiet Clicks, MagSpeed", tags: JSON.stringify(["Accessories", "Logitech"]), category: "Accessories", isTop: 0, isAvailable: 1 },
    { name: "Dell XPS 15", description: "Stunning 4K OLED display with high performance for creators", price: "1599.00", imageUrl: "/assets/dell-xps.jpg", specs: "i9 Processor, 32GB RAM, RTX 4060", tags: JSON.stringify(["Dell", "Laptop"]), category: "Laptops", isTop: 0, isAvailable: 1 },
  ]);
  console.log("Menu items seeded");
}

async function seedDemoCustomers() {
  const demoCustomers = [
    { email: "kwame.asante@gmail.com", name: "Kwame Asante" },
    { email: "abena.mensah@outlook.com", name: "Abena Mensah" },
    { email: "kofi.boateng@yahoo.com", name: "Kofi Boateng" },
    { email: "akosua.darko@gmail.com", name: "Akosua Darko" },
    { email: "yaw.owusu@gmail.com", name: "Yaw Owusu" },
  ];

  const passwordHash = await bcrypt.hash("customer2025", 10);
  for (const c of demoCustomers) {
    const [existing] = await db.select().from(users).where(eq(users.email, c.email));
    if (!existing) {
      await db.insert(users).values({
        email: c.email,
        passwordHash,
        name: c.name,
        role: "customer",
        phone: "+233 20 000 0000",
        address: "Accra, Ghana",
        createdAt: new Date(),
      });
    }
  }
  console.log("Demo customers seeded");
}

console.log("### SERVER_CHECKPOINT: Attempting to listen on PORT:", PORT);

httpServer.listen(PORT, "0.0.0.0", async () => {
  console.log(`### SERVER_SUCCESS: Backend running on 0.0.0.0:${PORT}`);
  try {
    const aiKey = process.env.GEMINI_API_KEY;
    if (aiKey) {
      console.log(`### AI_CHECK: Gemini key detected (Ends with ...${aiKey.slice(-4)})`);
    } else {
      console.error("### AI_CHECK: No GEMINI_API_KEY detected in environment!");
    }
    console.log("### SERVER_CHECKPOINT: Running initialization seeds...");
    await initializeDatabase();
    await seedSuperAdmin();
    await seedStaffAccounts();
    await seedMenuItems();
    await seedDemoCustomers();
    console.log("### SERVER_CHECKPOINT: Startup complete");
  } catch (err) {
    console.error("### SERVER_ERROR: Seed error:", err);
  }
});

// Global error handler for uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("### CRITICAL_ERROR: Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("### CRITICAL_ERROR: Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

export { io };
