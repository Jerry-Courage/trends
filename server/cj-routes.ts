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
import { runBotImport, botState } from "./cj-bot";

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

  const { q, categoryId, page = "1", pageSize = "20" } = req.query as Record<string, string>;
  if (!q && !categoryId) return res.status(400).json({ error: "Either q (search query) or categoryId is required" });

  try {
    let result;
    if (categoryId) {
      result = await getCJProductsByCategory(categoryId, Number(page), Number(pageSize));
    } else {
      result = await searchCJProducts(q, Number(page), Number(pageSize));
    }
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

    // Fetch product detail to get variants, gallery images, and video URL
    let resolvedVid = vid || null;
    let galleryImages: string | null = null;
    let videoUrl: string | null = null;
    try {
      const detail = await getCJProductDetail(pid);
      if (detail.variants && detail.variants.length > 0) {
        resolvedVid = detail.variants[0].vid;
      }
      if (detail.productImageSet && detail.productImageSet.length > 0) {
        galleryImages = JSON.stringify(detail.productImageSet);
      }
    } catch (err) {
      console.warn(`Could not fetch details/variants for CJ product ${pid}`, err);
    }

    const existing = await db.select().from(menuItems).where(eq(menuItems.cjPid, pid));
    let item;
    if (existing.length > 0) {
      item = await storage.updateMenuItem(existing[0].id, {
        name,
        description: description || `${name} — sourced via CJ Dropshipping`,
        price: sellPrice,
        imageUrl: imageUrl || null,
        category,
        cjVid: resolvedVid,
        cjCost: costPrice.toFixed(2),
        galleryImages,
        videoUrl,
        isAvailable: 1,
      });
    } else {
      item = await storage.createMenuItem({
        name,
        description: description || `${name} — sourced via CJ Dropshipping`,
        price: sellPrice,
        imageUrl: imageUrl || null,
        category,
        cjPid: pid,
        cjVid: resolvedVid,
        cjCost: costPrice.toFixed(2),
        galleryImages,
        videoUrl,
        isAvailable: 1,
        isTop: 0,
      });
    }

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
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    let page = 1;
    const pageSize = 50; // Fetch 50 at a time for efficiency

    while (imported < maxLimit) {
      let products: any[] = [];
      if (categoryId) {
        const result = await getCJProductsByCategory(categoryId, page, pageSize);
        products = result.list || [];
      } else {
        const result = await searchCJProducts(keyword, page, pageSize);
        products = result.list || [];
      }

      if (!products || products.length === 0) {
        break; // No more products available from CJ
      }

      for (const product of products) {
        if (imported >= maxLimit) break;

        try {
          const costPrice = parseFloat(product.sellPrice || "0");
          if (costPrice <= 0) { skipped++; continue; }

          // Check if already exists in DB
          const existing = await db.select().from(menuItems).where(eq(menuItems.cjPid, product.pid));
          if (existing.length > 0) {
            skipped++;
            continue; // Skip already imported items to avoid duplicates
          }

          const sellPrice = (costPrice * (1 + Number(markup) / 100)).toFixed(2);

          // Try to get variant ID, gallery images, and video URL
          let vid: string | null = null;
          let galleryImages: string | null = null;
          let videoUrl: string | null = null; // Always null as requested
          try {
            const detail = await getCJProductDetail(product.pid);
            if (detail.variants?.length > 0) vid = detail.variants[0].vid;
            if (detail.productImageSet && detail.productImageSet.length > 0) {
              galleryImages = JSON.stringify(detail.productImageSet);
            }
          } catch { /* skip if details fetch fails */ }

          await storage.createMenuItem({
            name: product.productNameEn,
            description: `${product.productNameEn} — ${product.categoryName || storeCategory}`,
            price: sellPrice,
            imageUrl: product.productImage || null,
            category: storeCategory,
            cjPid: product.pid,
            cjVid: vid,
            cjCost: costPrice.toFixed(2),
            galleryImages,
            videoUrl,
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

      page++;
      // Safety cap: don't request more than 10 pages
      if (page > 10) break;
    }

    res.json({
      imported,
      skipped,
      message: `Imported ${imported} new products${skipped > 0 ? `, skipped ${skipped} duplicate/invalid products` : ""}`,
      errors: errors.slice(0, 5),
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

// ─── CJ Automation Bot (Admin only) ───────────────────────────────────────────

router.get("/bot/status", auth, requireRole("admin"), (_req, res) => {
  res.json(botState);
});

router.post("/bot/trigger", auth, requireRole("admin"), (req, res) => {
  const { limit = 100, markup = 30 } = req.body;
  if (botState.running) {
    return res.status(409).json({ error: "Bot is already running" });
  }
  runBotImport(Number(limit), Number(markup));
  res.json({ message: "Bot triggered successfully in the background", status: botState });
});

// ─── Backfill Media (Admin only) ───────────────────────────────────────────────
// Goes through all products with a cjPid but missing gallery/video and patches them.

router.post("/bot/backfill-media", auth, requireRole("admin"), async (_req, res) => {
  // Respond immediately and run in background
  res.json({ message: "Backfill started in the background. Check bot logs for progress." });

  try {
    const { isNull, and, isNotNull } = await import("drizzle-orm");
    const allItems = await db
      .select()
      .from(menuItems)
      .where(and(isNotNull(menuItems.cjPid), isNull(menuItems.galleryImages)))
      .limit(100);

    console.log(`### BACKFILL: Found ${allItems.length} products to process in this batch. Starting...`);

    let patched = 0;
    let failed = 0;

    for (const item of allItems) {
      try {
        const detail = await getCJProductDetail(item.cjPid!);

        let galleryImages: string | null = null;
        if (detail.productImageSet && detail.productImageSet.length > 0) {
          galleryImages = JSON.stringify(detail.productImageSet);
        }

        let videoUrl: string | null = null;
        const rawVideo: any = (detail as any).productVideo;
        if (rawVideo) {
          if (Array.isArray(rawVideo) && rawVideo.length > 0) {
            videoUrl = rawVideo[0];
          } else if (typeof rawVideo === "string") {
            videoUrl = rawVideo;
          }
        }
        if (videoUrl && videoUrl.startsWith("//")) {
          videoUrl = "https:" + videoUrl;
        }

        let vid = item.cjVid;
        if (!vid && detail.variants?.length > 0) {
          vid = detail.variants[0].vid;
        }

        await storage.updateMenuItem(item.id, { galleryImages, videoUrl, cjVid: vid });
        patched++;
        console.log(`### BACKFILL [${patched}/${allItems.length}]: ${item.name}`);

        // Rate-limit: 1 request per 3000ms to stay safely under CJ limits
        await new Promise(r => setTimeout(r, 3000));
      } catch (err: any) {
        if (err.message?.includes("429") || err.status === 429) {
           console.error(`### BACKFILL FATAL: Hit CJ API Rate Limit (429) at product ${item.name}. Halting batch to protect IP.`);
           break; // Stop the entire loop to prevent permanent ban
        } else {
           failed++;
           console.warn(`### BACKFILL FAILED for ${item.name}: ${err.message}`);
        }
      }
    }
    
    console.log(`### BACKFILL BATCH COMPLETE: ${patched} patched, ${failed} failed.`);
  } catch (err: any) {
    console.error(`### BACKFILL ERROR: ${err.message}`);
  }
});

export default router;
