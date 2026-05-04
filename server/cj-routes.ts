/**
 * CJ Dropshipping API Routes
 * All routes are prefixed with /api/cj
 */
import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import {
  searchCJProducts,
  getCJProductDetail,
  getCJProductsByCategory,
  getCJCategories,
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
    return res.status(503).json({ error: "CJ Dropshipping API key not configured. Add CJ_API_KEY to your environment variables." });
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
    return res.status(503).json({ error: "CJ API key not configured" });
  }

  const { pid, vid, name, description, price, category, imageUrl, markup = 30 } = req.body;

  if (!pid || !name || !price || !category) {
    return res.status(400).json({ error: "pid, name, price, and category are required" });
  }

  try {
    const costPrice = parseFloat(price);
    const sellPrice = (costPrice * (1 + Number(markup) / 100)).toFixed(2);

    // If no vid provided, fetch product detail to get the first variant's vid
    let resolvedVid = vid || null;
    if (!resolvedVid) {
      try {
        const detail = await getCJProductDetail(pid);
        if (detail.variants && detail.variants.length > 0) {
          resolvedVid = detail.variants[0].vid;
        }
      } catch {
        // If we can't fetch variants, continue without vid — user can still manually fulfill
        console.warn(`Could not fetch variants for CJ product ${pid}`);
      }
    }

    const item = await storage.createMenuItem({
      name,
      description: description || `${name} — sourced via CJ Dropshipping`,
      price: sellPrice,
      imageUrl: imageUrl || null,
      category,
      cjPid: pid,
      cjVid: resolvedVid,
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

// ─── Get CJ Categories ────────────────────────────────────────────────────────

router.get("/categories", auth, requireRole("admin"), async (_req, res) => {
  if (!isCJConfigured()) return res.status(503).json({ error: "CJ API key not configured" });
  try {
    const cats = await getCJCategories();
    res.json(cats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Bulk Import by Category ──────────────────────────────────────────────────

router.post("/products/bulk-import", auth, requireRole("admin"), async (req, res) => {
  if (!isCJConfigured()) return res.status(503).json({ error: "CJ API key not configured" });

  const { keyword, categoryId, limit = 20, markup = 30, storeCategory = "Electronics" } = req.body;

  if (!keyword && !categoryId) {
    return res.status(400).json({ error: "Either keyword or categoryId is required" });
  }

  const maxLimit = Math.min(Number(limit), 200);

  try {
    // Fetch products from CJ
    let products: any[] = [];
    if (categoryId) {
      const result = await getCJProductsByCategory(categoryId, 1, maxLimit);
      products = result.list;
    } else {
      // Fetch more than needed so we have enough after filtering
      const result = await searchCJProducts(keyword, 1, maxLimit);
      products = result.list;
    }

    if (products.length === 0) {
      return res.json({ imported: 0, skipped: 0, message: "No products found" });
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const product of products) {
      try {
        const costPrice = parseFloat(product.sellPrice || "0");
        if (costPrice <= 0) { skipped++; continue; }

        const sellPrice = (costPrice * (1 + Number(markup) / 100)).toFixed(2);

        // Try to get variant ID
        let vid: string | null = null;
        try {
          const detail = await getCJProductDetail(product.pid);
          if (detail.variants?.length > 0) vid = detail.variants[0].vid;
        } catch { /* skip vid if fetch fails */ }

        await storage.createMenuItem({
          name: product.productNameEn,
          description: `${product.productNameEn} — ${product.categoryName || storeCategory}`,
          price: sellPrice,
          imageUrl: product.productImage || null,
          category: storeCategory,
          cjPid: product.pid,
          cjVid: vid,
          cjCost: costPrice.toFixed(2),
          isAvailable: 1,
          isTop: 0,
        });
        imported++;

        // Small delay to avoid CJ rate limits
        await new Promise(r => setTimeout(r, 100));
      } catch (err: any) {
        skipped++;
        errors.push(`${product.productNameEn}: ${err.message}`);
      }
    }

    res.json({
      imported,
      skipped,
      total: products.length,
      message: `Imported ${imported} products${skipped > 0 ? `, skipped ${skipped}` : ""}`,
      errors: errors.slice(0, 5), // only first 5 errors
    });
  } catch (err: any) {
    console.error("Bulk import error:", err);
    res.status(500).json({ error: err.message });
  }
});

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
    // Build CJ order items — try cjVid first, fall back to fetching variants from CJ
    const cjItems: { vid: string; quantity: number }[] = [];
    const missingVid: string[] = [];

    for (const item of order.items) {
      if (item.menuItemId) {
        const menuItem = await storage.getMenuItem(item.menuItemId);
        if (menuItem?.cjVid) {
          cjItems.push({ vid: menuItem.cjVid, quantity: item.quantity });
        } else if (menuItem?.cjPid) {
          // Try to fetch the variant ID from CJ now
          try {
            const detail = await getCJProductDetail(menuItem.cjPid);
            if (detail.variants && detail.variants.length > 0) {
              const vid = detail.variants[0].vid;
              // Save it for future orders
              await db.update(menuItems)
                .set({ cjVid: vid, updatedAt: new Date() })
                .where(eq(menuItems.id, menuItem.id));
              cjItems.push({ vid, quantity: item.quantity });
            } else {
              missingVid.push(item.name);
            }
          } catch {
            missingVid.push(item.name);
          }
        } else {
          missingVid.push(item.name);
        }
      }
    }

    if (cjItems.length === 0) {
      return res.status(400).json({
        error: `Cannot fulfill: none of the products in this order are linked to CJ. Products without CJ link: ${missingVid.join(", ")}. Re-import these products from the CJ Import tab.`,
      });
    }

    if (missingVid.length > 0) {
      console.warn(`Partial CJ fulfill for order ${orderId} — skipping non-CJ items: ${missingVid.join(", ")}`);
    }

    const referenceNo = `TRENDS-${orderId}-${Date.now()}`;
    const result = await createCJOrder(referenceNo, shippingAddress, cjItems);

    // Save CJ order details back to our order
    await db.update(orders)
      .set({
        cjOrderId: result.orderId,
        cjOrderNum: result.orderNumber || result.orderNum || null,
        shippingCountry: shippingAddress.country,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    res.json({
      success: true,
      cjOrderId: result.orderId,
      cjOrderNum: result.orderNumber || result.orderNum,
      skippedItems: missingVid.length > 0 ? missingVid : undefined,
    });
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
