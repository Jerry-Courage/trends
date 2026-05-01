/**
 * CJ Dropshipping API Routes
 * All routes are prefixed with /api/cj
 */
import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import {
  searchCJProducts,
  getCJProductDetail,
  getCJShippingRates,
  createCJOrder,
  getCJOrderTracking,
  isCJConfigured,
} from "./cj";
import { storage } from "./storage";
import { db } from "./db";
import { orders, menuItems } from "../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "trends-electronics-secret-key-change-in-production";

interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// ─── Status Check ─────────────────────────────────────────────────────────────

router.get("/status", (_req, res) => {
  res.json({ configured: isCJConfigured() });
});

// ─── Product Search (Admin only) ──────────────────────────────────────────────

router.get("/products/search", auth, requireRole("admin"), async (req, res) => {
  if (!isCJConfigured()) {
    return res.status(503).json({ error: "CJ Dropshipping API keys not configured. Add CJ_API_EMAIL and CJ_API_KEY to your environment variables." });
  }

  const { q, page = "1", pageSize = "20" } = req.query as Record<string, string>;
  if (!q) return res.status(400).json({ error: "q (search query) is required" });

  try {
    const result = await searchCJProducts(q, Number(page), Number(pageSize));
    res.json(result);
  } catch (err: any) {
    console.error("CJ product search error:", err);
    res.status(500).json({ error: err.message || "CJ product search failed" });
  }
});

router.get("/products/:pid", auth, requireRole("admin"), async (req, res) => {
  if (!isCJConfigured()) {
    return res.status(503).json({ error: "CJ API keys not configured" });
  }
  try {
    const product = await getCJProductDetail(req.params.pid);
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Import CJ Product into Store Catalog ─────────────────────────────────────

router.post("/products/import", auth, requireRole("admin"), async (req, res) => {
  if (!isCJConfigured()) {
    return res.status(503).json({ error: "CJ API keys not configured" });
  }

  const { pid, vid, name, description, price, category, imageUrl, markup = 30 } = req.body;

  if (!pid || !name || !price || !category) {
    return res.status(400).json({ error: "pid, name, price, and category are required" });
  }

  try {
    // Calculate sell price with markup
    const costPrice = parseFloat(price);
    const sellPrice = (costPrice * (1 + Number(markup) / 100)).toFixed(2);

    const item = await storage.createMenuItem({
      name,
      description: description || `${name} — sourced via CJ Dropshipping`,
      price: sellPrice,
      imageUrl: imageUrl || null,
      category,
      cjPid: pid,
      cjVid: vid || null,
      cjCost: costPrice.toFixed(2),
      isAvailable: 1,
      isTop: 0,
    });

    res.status(201).json(item);
  } catch (err: any) {
    console.error("CJ import error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Shipping Rates ───────────────────────────────────────────────────────────

router.get("/shipping/rates", async (req, res) => {
  if (!isCJConfigured()) {
    // Return mock rates when not configured so UI still works
    return res.json([
      { logisticName: "CJ Packet", logisticAbbreviation: "CJPacket", logisticPrice: 3.99, estimateDeliveryDays: "7-15" },
      { logisticName: "CJ Express", logisticAbbreviation: "CJExpress", logisticPrice: 12.99, estimateDeliveryDays: "3-7" },
    ]);
  }

  const { pid, country = "US", quantity = "1" } = req.query as Record<string, string>;
  if (!pid) return res.status(400).json({ error: "pid is required" });

  try {
    const rates = await getCJShippingRates(pid, country, Number(quantity));
    res.json(rates);
  } catch (err: any) {
    console.error("CJ shipping rates error:", err);
    // Fallback rates on error
    res.json([
      { logisticName: "Standard Shipping", logisticAbbreviation: "Standard", logisticPrice: 4.99, estimateDeliveryDays: "10-20" },
    ]);
  }
});

// ─── Fulfill Order via CJ ─────────────────────────────────────────────────────

router.post("/orders/:orderId/fulfill", auth, requireRole("admin", "warehouse"), async (req, res) => {
  if (!isCJConfigured()) {
    return res.status(503).json({ error: "CJ API keys not configured. Add CJ_API_EMAIL and CJ_API_KEY to your .env file." });
  }

  const orderId = Number(req.params.orderId);
  const order = await storage.getOrderById(orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });

  if (order.cjOrderId) {
    return res.status(409).json({ error: "Order already submitted to CJ", cjOrderId: order.cjOrderId });
  }

  const { shippingAddress } = req.body;
  if (!shippingAddress?.country || !shippingAddress?.address || !shippingAddress?.consignee) {
    return res.status(400).json({ error: "shippingAddress with consignee, country, province, city, address, zip, phone is required" });
  }

  try {
    // Build CJ order items from order items that have CJ variant IDs
    const cjItems: { vid: string; quantity: number }[] = [];

    for (const item of order.items) {
      if (item.menuItemId) {
        const menuItem = await storage.getMenuItem(item.menuItemId);
        if (menuItem?.cjVid) {
          cjItems.push({ vid: menuItem.cjVid, quantity: item.quantity });
        }
      }
    }

    if (cjItems.length === 0) {
      return res.status(400).json({
        error: "No CJ-linked products found in this order. Make sure products were imported from CJ with a variant ID.",
      });
    }

    const referenceNo = `TRENDS-${orderId}-${Date.now()}`;
    const result = await createCJOrder(referenceNo, shippingAddress, cjItems);

    // Save CJ order details back to our order
    await db.update(orders)
      .set({
        cjOrderId: result.orderId,
        cjOrderNum: result.orderNum,
        shippingCountry: shippingAddress.country,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    res.json({ success: true, cjOrderId: result.orderId, cjOrderNum: result.orderNum });
  } catch (err: any) {
    console.error("CJ order fulfillment error:", err);
    res.status(500).json({ error: err.message || "CJ order fulfillment failed" });
  }
});

// ─── Sync Tracking from CJ ────────────────────────────────────────────────────

router.post("/orders/:orderId/sync-tracking", auth, requireRole("admin", "warehouse"), async (req, res) => {
  if (!isCJConfigured()) {
    return res.status(503).json({ error: "CJ API keys not configured" });
  }

  const orderId = Number(req.params.orderId);
  const order = await storage.getOrderById(orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (!order.cjOrderId) return res.status(400).json({ error: "Order has not been submitted to CJ yet" });

  try {
    const tracking = await getCJOrderTracking(order.cjOrderId);

    await db.update(orders)
      .set({
        cjTrackingNo: tracking.trackNumber || null,
        cjLogistic: tracking.logisticName || null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    res.json({
      trackingNumber: tracking.trackNumber,
      carrier: tracking.logisticName,
      status: tracking.status,
      details: tracking.trackingDetails || [],
    });
  } catch (err: any) {
    console.error("CJ tracking sync error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Get CJ tracking for a customer order ─────────────────────────────────────

router.get("/orders/:orderId/tracking", auth, async (req: AuthRequest, res) => {
  const orderId = Number(req.params.orderId);
  const order = await storage.getOrderById(orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });

  // Customers can only see their own orders
  if (req.user!.role === "customer" && order.userId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json({
    cjOrderId: order.cjOrderId || null,
    cjOrderNum: order.cjOrderNum || null,
    trackingNumber: order.cjTrackingNo || null,
    carrier: order.cjLogistic || null,
    shippingCountry: order.shippingCountry || null,
  });
});

export default router;
