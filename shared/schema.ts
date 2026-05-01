import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// SQLite doesn't have native enums, so we'll use text with Zod validation
export const roles = ["customer", "admin"] as const;
export const orderStatuses = [
  "pending",
  "confirmed",
  "packaging",
  "ready",
  "assigned",
  "picked_up",
  "delivered",
  "cancelled",
] as const;

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // Optional for OAuth users
  googleId: text("google_id").unique(), // For Google OAuth
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role", { enum: roles }).notNull().default("customer"),
  address: text("address"),
  points: integer("points").notNull().default(0),
  interests: text("interests"),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const menuItems = sqliteTable("menu_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: text("price").notNull(), // Switched to text for decimal precision
  imageUrl: text("image_url"),
  category: text("category").notNull(),
  specs: text("specs"),
  tags: text("tags"), // Stored as JSON string
  rating: text("rating"),
  reviews: integer("reviews"),
  isTop: integer("is_top").default(0),
  isAvailable: integer("is_available").default(1),
  // CJ Dropshipping fields
  cjPid: text("cj_pid"),       // CJ product ID
  cjVid: text("cj_vid"),       // CJ default variant ID
  cjCost: text("cj_cost"),     // CJ wholesale cost (for margin tracking)
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status", { enum: orderStatuses }).notNull().default("pending"),
  deliveryAddress: text("delivery_address").notNull(),
  subtotal: text("subtotal").notNull(),
  deliveryFee: text("delivery_fee").notNull(),
  tax: text("tax").notNull(),
  tip: text("tip").notNull(),
  total: text("total").notNull(),
  currency: text("currency").notNull().default("USD"),
  paymentMethod: text("payment_method").notNull().default("card"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  transactionId: text("transaction_id"),
  courierId: integer("courier_id").references(() => users.id),
  courierLat: real("courier_lat"),
  courierLng: real("courier_lng"),
  customerLat: real("customer_lat"),
  customerLng: real("customer_lng"),
  notes: text("notes"),
  // CJ Dropshipping fulfillment fields
  cjOrderId: text("cj_order_id"),       // CJ's internal order ID
  cjOrderNum: text("cj_order_num"),     // CJ's order number
  cjTrackingNo: text("cj_tracking_no"), // Shipping tracking number
  cjLogistic: text("cj_logistic"),      // Shipping carrier name
  shippingCountry: text("shipping_country"),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id),
  menuItemId: integer("menu_item_id"),
  name: text("name").notNull(),
  price: text("price").notNull(),
  quantity: integer("quantity").notNull(),
  extras: text("extras"), // Stored as JSON string
  specialInstructions: text("special_instructions"),
});

export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  googleId: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(roles).optional(),
  address: z.string().optional(),
  points: z.number().optional(),
  interests: z.string().optional(),
});

export const insertOrderSchema = z.object({
  userId: z.number().int(),
  deliveryAddress: z.string().min(1),
  subtotal: z.string(),
  deliveryFee: z.string(),
  tax: z.string(),
  tip: z.string(),
  total: z.string(),
  paymentMethod: z.string(),
  notes: z.string().optional(),
});

export const insertOrderItemSchema = z.object({
  orderId: z.number().int(),
  menuItemId: z.number().int().optional(),
  name: z.string(),
  price: z.string(),
  quantity: z.number().int().min(1),
  extras: z.string().optional(),
  specialInstructions: z.string().optional(),
});

export type User = typeof users.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export const insertFavoriteSchema = z.object({
  userId: z.number().int(),
  menuItemId: z.number().int(),
});
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
