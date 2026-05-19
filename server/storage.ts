import { eq, desc, and, sql, or, like } from "drizzle-orm";
import { db } from "./db";
import {
  users, orders, orderItems, menuItems, favorites,
  User, Order, OrderItem, MenuItem, Favorite, roles
} from "../shared/schema";
import bcrypt from "bcryptjs";

// Helper to handle JSON parsing for SQLite "arrays"
function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

function parseExtras(extras: string | null): string[] {
  if (!extras) return [];
  try {
    return JSON.parse(extras);
  } catch {
    return [];
  }
}

export interface IStorage {
  // Auth
  createUser(data: { email: string; password?: string; googleId?: string; name: string; phone?: string; role?: (typeof roles)[number]; address?: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByGoogleId(googleId: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  validatePassword(user: User, password: string): Promise<boolean>;
  getUsersByRole(role: string): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
  getAllCouriers(): Promise<User[]>;

  // Menu
  getMenuItems(includeUnavailable?: boolean): Promise<MenuItem[]>;
  getPaginatedMenuItems(page: number, limit: number, category?: string, search?: string): Promise<{ items: MenuItem[], total: number }>;
  getMenuItem(id: number): Promise<MenuItem | null>;
  createMenuItem(data: any): Promise<MenuItem>;
  updateMenuItem(id: number, data: any): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;
  addRating(id: number, rating: number): Promise<MenuItem>;

  // Orders
  createOrder(data: {
    userId: number;
    deliveryAddress: string;
    subtotal: string;
    deliveryFee: string;
    tax: string;
    tip: string;
    total: string;
    paymentMethod: string;
    notes?: string;
    items: { menuItemId?: number; name: string; price: string; quantity: number; extras?: string[]; specialInstructions?: string }[];
  }): Promise<Order>;
  getOrderById(id: number): Promise<(Order & { items: OrderItem[] }) | null>;
  getOrdersByUser(userId: number): Promise<(Order & { items: OrderItem[] })[]>;
  getAllOrders(): Promise<(Order & { items: OrderItem[]; customer: User; courier?: User | null })[]>;
  getCourierOrders(courierId: number): Promise<(Order & { items: OrderItem[]; customer: User })[]>;
  updateOrderStatus(id: number, status: Order["status"]): Promise<Order>;
  updatePaymentStatus(id: number, status: string, transactionId?: string): Promise<Order>;
  updateMenuItemImage(id: number, imageUrl: string): Promise<MenuItem>;
  assignCourier(orderId: number, courierId: number): Promise<Order>;
  updateCourierLocation(orderId: number, lat: number, lng: number): Promise<Order>;
  updateCustomerLocation(orderId: number, lat: number, lng: number): Promise<Order>;
  updateUserProfile(id: number, data: { name?: string; phone?: string; address?: string; interests?: string }): Promise<User | null>;

  // Favorites
  getFavorites(userId: number): Promise<MenuItem[]>;
  addFavorite(userId: number, menuItemId: number): Promise<void>;
  removeFavorite(userId: number, menuItemId: number): Promise<void>;

  // Admin Stats
  getAdminStats(days: number): Promise<{
    revenue: { date: string; amount: number }[];
    orders: { date: string; count: number }[];
    popularItems: { name: string; count: number }[];
    totalRevenue: number;
    totalOrders: number;
    activeUsers: number;
    peakHours: { hour: string; count: number }[];
    userSegments: { name: string; value: number }[];
  }>;
  getAdminUsers(): Promise<(User & { totalSpend: number; orderCount: number })[]>;
}

export class Storage implements IStorage {
  async createUser(data: { email: string; password?: string; googleId?: string; name: string; phone?: string; role?: (typeof roles)[number]; address?: string }): Promise<User> {
    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;
    const [user] = await db.insert(users).values({
      email: data.email,
      passwordHash,
      googleId: data.googleId ?? null,
      name: data.name,
      phone: data.phone,
      role: data.role ?? "customer",
      address: data.address,
      points: 0,
      createdAt: new Date(),
    }).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async getUserByGoogleId(googleId: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user ?? null;
  }

  async getUserById(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    if (!user.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash as string);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role as any));
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllCouriers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, "courier"));
  }

  async getMenuItems(includeUnavailable?: boolean): Promise<MenuItem[]> {
    if (includeUnavailable) {
      return db.select().from(menuItems).orderBy(desc(menuItems.createdAt));
    }
    return db.select().from(menuItems).where(eq(menuItems.isAvailable, 1)).orderBy(desc(menuItems.createdAt));
  }

  async getPaginatedMenuItems(page: number, limit: number, category?: string, search?: string, localOnly?: boolean): Promise<{ items: MenuItem[], total: number }> {
    const offset = (page - 1) * limit;
    
    const conditions = [eq(menuItems.isAvailable, 1)];
    if (category && category !== "All") {
      conditions.push(eq(menuItems.category, category));
    }
    if (search) {
      const s = `%${search}%`;
      conditions.push(
        or(
          like(menuItems.name, s),
          like(menuItems.description, s)
        )
      );
    }
    if (localOnly) {
      conditions.push(like(menuItems.tags, '%"available_in_ghana"%'));
    }
    
    const whereClause = and(...conditions);
    
    // Count total
    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(menuItems)
      .where(whereClause);
      
    const total = Number(countResult.count);
    
    // Fetch page
    const items = await db
      .select()
      .from(menuItems)
      .where(whereClause)
      .orderBy(desc(menuItems.createdAt))
      .limit(limit)
      .offset(offset);
      
    return { items, total };
  }

  async getMenuItem(id: number): Promise<MenuItem | null> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item ?? null;
  }

  async createMenuItem(data: any): Promise<MenuItem> {
    const [item] = await db.insert(menuItems).values({
      ...data,
      isTop: data.isTop ? 1 : 0,
      isAvailable: data.isAvailable ? 1 : 0,
    }).returning();
    return item;
  }

  async updateMenuItem(id: number, data: any): Promise<MenuItem> {
    const [item] = await db.update(menuItems)
      .set({
        ...data,
        isTop: data.isTop !== undefined ? (data.isTop ? 1 : 0) : undefined,
        isAvailable: data.isAvailable !== undefined ? (data.isAvailable ? 1 : 0) : undefined,
        updatedAt: new Date()
      })
      .where(eq(menuItems.id, id))
      .returning();
    if (!item) throw new Error("Menu item not found");
    return item;
  }

  async addRating(id: number, newRating: number): Promise<MenuItem> {
    const item = await this.getMenuItem(id);
    if (!item) throw new Error("Menu item not found");
    
    const currentRating = item.rating ? parseFloat(item.rating) : 0;
    const currentReviews = item.reviews || 0;
    
    const nextReviews = currentReviews + 1;
    const nextRating = ((currentRating * currentReviews) + newRating) / nextReviews;
    
    const [updated] = await db.update(menuItems)
      .set({
        rating: nextRating.toFixed(1),
        reviews: nextReviews,
        updatedAt: new Date()
      })
      .where(eq(menuItems.id, id))
      .returning();
      
    return updated;
  }

  async deleteMenuItem(id: number): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  async createOrder(data: {
    userId: number;
    deliveryAddress: string;
    subtotal: string;
    deliveryFee: string;
    tax: string;
    tip: string;
    total: string;
    paymentMethod: string;
    notes?: string;
    items: { menuItemId?: number; name: string; price: string; quantity: number; extras?: string[]; specialInstructions?: string }[];
  }): Promise<Order> {
    const now = new Date();
    const [order] = await db.insert(orders).values({
      userId: data.userId,
      deliveryAddress: data.deliveryAddress,
      subtotal: data.subtotal,
      deliveryFee: data.deliveryFee,
      tax: data.tax,
      tip: data.tip,
      total: data.total,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    }).returning();

    if (data.items.length > 0) {
      await db.insert(orderItems).values(
        data.items.map(item => ({
          orderId: order.id,
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          extras: item.extras ? JSON.stringify(item.extras) : null,
          specialInstructions: item.specialInstructions,
        }))
      );
    }

    return order;
  }

  async getOrderById(id: number): Promise<(Order & { items: OrderItem[]; courier?: { id: number; name: string } | null; cjOrderId?: string | null; cjOrderNum?: string | null; cjTrackingNo?: string | null; cjLogistic?: string | null; shippingCountry?: string | null }) | null> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return null;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    let courier: { id: number; name: string } | null = null;
    if (order.courierId) {
      const [r] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, order.courierId));
      courier = r ?? null;
    }
    return { ...order, items, courier };
  }

  async getOrdersByUser(userId: number): Promise<(Order & { items: OrderItem[] })[]> {
    const userOrders = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
    const result = await Promise.all(
      userOrders.map(async order => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return { ...order, items };
      })
    );
    return result;
  }

  async getAllOrders(): Promise<(Order & { items: OrderItem[]; customer: User; courier?: User | null })[]> {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const result = await Promise.all(
      allOrders.map(async order => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        const [customer] = await db.select().from(users).where(eq(users.id, order.userId));
        let courier: User | null = null;
        if (order.courierId) {
          const [r] = await db.select().from(users).where(eq(users.id, order.courierId));
          courier = r ?? null;
        }
        return { ...order, items, customer, courier };
      })
    );
    return result;
  }

  async getCourierOrders(courierId: number): Promise<(Order & { items: OrderItem[]; customer: User })[]> {
    const courierOrders = await db.select().from(orders).where(
      eq(orders.courierId, courierId)
    ).orderBy(desc(orders.createdAt));
    const result = await Promise.all(
      courierOrders.map(async order => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        const [customer] = await db.select().from(users).where(eq(users.id, order.userId));
        return { ...order, items, customer };
      })
    );
    return result;
  }

  async updateOrderStatus(id: number, status: Order["status"]): Promise<Order> {
    const [order] = await db.update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    // Award points on delivery: 10 pts per 1 GH₵
    if (status === "delivered" && order) {
      const pointsEarned = Math.floor(parseFloat(order.total) * 10);
      await db.update(users)
        .set({ points: sql`${users.points} + ${pointsEarned}` })
        .where(eq(users.id, order.userId));
    }

    return order;
  }

  async updatePaymentStatus(id: number, status: string, transactionId?: string): Promise<Order> {
    const [order] = await db.update(orders)
      .set({ paymentStatus: status, transactionId: transactionId ?? null, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async updateMenuItemImage(id: number, imageUrl: string): Promise<MenuItem> {
    const [item] = await db.update(menuItems)
      .set({ imageUrl, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return item;
  }

  async updateUserProfile(id: number, data: { name?: string; phone?: string; address?: string; interests?: string }): Promise<User | null> {
    const updates: Partial<typeof users.$inferInsert> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.address !== undefined) updates.address = data.address;
    if (data.interests !== undefined) updates.interests = data.interests;
    if (Object.keys(updates).length === 0) {
      return this.getUserById(id);
    }
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user ?? null;
  }

  // Favorites
  async getFavorites(userId: number): Promise<MenuItem[]> {
    const userFavs = await db.select().from(favorites).where(eq(favorites.userId, userId));
    if (userFavs.length === 0) return [];
    
    const itemIds = userFavs.map(f => f.menuItemId);
    return db.select().from(menuItems).where(sql`${menuItems.id} IN (${sql.join(itemIds, sql`, `)})`);
  }

  async addFavorite(userId: number, menuItemId: number): Promise<void> {
    const existing = await db.select().from(favorites).where(
      and(eq(favorites.userId, userId), eq(favorites.menuItemId, menuItemId))
    );
    if (existing.length === 0) {
      await db.insert(favorites).values({ userId, menuItemId });
    }
  }

  async removeFavorite(userId: number, menuItemId: number): Promise<void> {
    await db.delete(favorites).where(
      and(eq(favorites.userId, userId), eq(favorites.menuItemId, menuItemId))
    );
  }

  async assignCourier(orderId: number, courierId: number): Promise<Order> {
    const [order] = await db.update(orders)
      .set({ courierId, status: "assigned", updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  async updateCourierLocation(orderId: number, lat: number, lng: number): Promise<Order> {
    const [order] = await db.update(orders)
      .set({ courierLat: lat, courierLng: lng, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  async updateCustomerLocation(orderId: number, lat: number, lng: number): Promise<Order> {
    const [order] = await db.update(orders)
      .set({ customerLat: lat, customerLng: lng, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  async getAdminStats(days: number): Promise<{
    revenue: { date: string; amount: number }[];
    orders: { date: string; count: number }[];
    popularItems: { name: string; count: number }[];
    totalRevenue: number;
    totalOrders: number;
    activeUsers: number;
    peakHours: { hour: string; count: number }[];
    userSegments: { name: string; value: number }[];
  }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffMs = cutoff.getTime();

    const allOrders = await db.select().from(orders);
    const recentOrders = allOrders.filter(o => {
      if (!o.createdAt || isNaN(o.createdAt.getTime())) return true; // include legacy orders with bad timestamps
      return o.createdAt.getTime() >= cutoffMs;
    });
    
    // Aggregate by date
    const dailyStats: Record<string, { revenue: number, orders: number }> = {};
    let totalRevenue = 0;

    recentOrders.forEach(order => {
      const ts = (order.createdAt && !isNaN(order.createdAt.getTime())) ? order.createdAt : new Date();
      const date = ts.toISOString().split('T')[0];
      const amount = parseFloat(order.total);
      totalRevenue += amount;

      if (!dailyStats[date]) dailyStats[date] = { revenue: 0, orders: 0 };
      dailyStats[date].revenue += amount;
      dailyStats[date].orders += 1;
    });

    const revenue = Object.entries(dailyStats).map(([date, stats]) => ({ date, amount: stats.revenue }));
    const orderData = Object.entries(dailyStats).map(([date, stats]) => ({ date, count: stats.orders }));

    // Popular items
    const allOrderItems = await db.select().from(orderItems);
    const itemCounts: Record<string, number> = {};
    
    // Filter items belonging to recent orders
    const recentOrderIds = new Set(recentOrders.map(o => o.id));
    allOrderItems.filter(item => recentOrderIds.has(item.orderId)).forEach(item => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });

    const popularItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const allCustomers = await db.select().from(users).where(eq(users.role, "customer"));

    return {
      revenue,
      orders: orderData,
      popularItems,
      totalRevenue,
      totalOrders: recentOrders.length,
      activeUsers: allCustomers.length,
      peakHours: this.calculatePeakHours(allOrders),
      userSegments: this.calculateUserSegments(allOrders, allCustomers),
    };
  }

  private calculatePeakHours(allOrders: Order[]): { hour: string; count: number }[] {
    const hours: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hours[i] = 0;

    allOrders.forEach(o => {
      const ts = (o.createdAt && !isNaN(o.createdAt.getTime())) ? o.createdAt : new Date();
      const hour = ts.getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    });

    return Object.entries(hours).map(([hour, count]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      count
    }));
  }

  private calculateUserSegments(allOrders: Order[], allCustomers: User[]): { name: string; value: number }[] {
    const segments = {
      "New Customers": 0,
      "Returning Customers": 0,
      "VIP Customers": 0
    };

    const userStats: Record<number, number> = {};
    allOrders.forEach(o => {
      userStats[o.userId] = (userStats[o.userId] || 0) + 1;
    });

    allCustomers.forEach(u => {
      const count = userStats[u.id] || 0;
      if (count === 0) return;
      if (count === 1) segments["New Customers"]++;
      else if (count < 5) segments["Returning Customers"]++;
      else segments["VIP Customers"]++;
    });

    return Object.entries(segments).map(([name, value]) => ({ name, value }));
  }

  async getAdminUsers(): Promise<(User & { totalSpend: number; orderCount: number })[]> {
    const fetchedUsers = await db.select().from(users);
    const filteredUsers = fetchedUsers.filter(u => u.role === "customer" || u.role === "courier");

    const result = await Promise.all(
      filteredUsers.map(async user => {
        const userOrders = await db.select().from(orders).where(eq(orders.userId, user.id));
        const totalSpend = userOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);
        return {
          ...user,
          totalSpend,
          orderCount: userOrders.length,
        };
      })
    );

    return result.sort((a, b) => b.totalSpend - a.totalSpend);
  }
}

export const storage = new Storage();
