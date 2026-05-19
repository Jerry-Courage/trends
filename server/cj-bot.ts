import { getCJCategories, getCJProductsByCategory, getCJProductDetail } from "./cj";
import { storage } from "./storage";
import { db } from "./db";
import { menuItems } from "../shared/schema";
import { eq } from "drizzle-orm";

interface BotState {
  running: boolean;
  currentCategory: string;
  importedCount: number;
  skippedCount: number;
  errors: string[];
  logs: string[];
  lastRun: Date | null;
}

export const botState: BotState = {
  running: false,
  currentCategory: "",
  importedCount: 0,
  skippedCount: 0,
  errors: [],
  logs: [],
  lastRun: null,
};

function logMessage(msg: string) {
  const time = new Date().toLocaleTimeString();
  const fullMsg = `[${time}] ${msg}`;
  botState.logs.push(fullMsg);
  // Keep last 100 lines of logs
  if (botState.logs.length > 100) botState.logs.shift();
  console.log(`[CJ Bot] ${msg}`);
}

function mapToStoreCategory(parentName: string, subName: string): string {
  const p = (parentName || "").toLowerCase();
  const s = (subName || "").toLowerCase();

  if (p.includes("computer") || p.includes("phone") || p.includes("electronic") || s.includes("electronic") || p.includes("office") || s.includes("office")) {
    return "Electronics";
  }
  if (p.includes("apparel") || p.includes("bag") || p.includes("shoe") || p.includes("jewelry") || p.includes("watch") || p.includes("clothing") || p.includes("accessory") || s.includes("accessory")) {
    return "Fashion & Apparel";
  }
  if (p.includes("home") || p.includes("garden") || p.includes("kitchen") || s.includes("kitchen") || p.includes("furniture") || s.includes("furniture")) {
    return "Home & Kitchen";
  }
  if (p.includes("sport") || p.includes("outdoor") || s.includes("outdoor") || p.includes("fitness") || s.includes("fitness")) {
    return "Sports & Outdoors";
  }
  if (p.includes("beauty") || p.includes("health") || p.includes("hair") || s.includes("beauty") || s.includes("care")) {
    return "Beauty & Care";
  }
  if (p.includes("toy") || s.includes("toy") || p.includes("hobby") || s.includes("hobby") || p.includes("game") || s.includes("game") || p.includes("baby") || s.includes("baby")) {
    return "Toys & Hobbies";
  }
  return "Electronics";
}

export async function runBotImport(limitPerCategory = 100, markup = 30) {
  if (botState.running) {
    logMessage("Bot is already running!");
    return;
  }

  botState.running = true;
  botState.importedCount = 0;
  botState.skippedCount = 0;
  botState.errors = [];
  botState.logs = [];
  botState.currentCategory = "Initializing...";

  logMessage("Starting automated category import bot...");

  // Run asynchronously in background so we don't block requests
  (async () => {
    try {
      logMessage("Fetching categories from CJ...");
      const allCategories = await getCJCategories();
      if (!allCategories || allCategories.length === 0) {
        logMessage("No categories returned from CJ API.");
        botState.running = false;
        return;
      }

      logMessage(`Found ${allCategories.length} categories on CJ. Grouping categories...`);

      // Group subcategories by first-level parent category to ensure even distribution
      const categoriesByParent: Record<string, typeof allCategories> = {};
      for (const cat of allCategories) {
        const parent = cat.categoryFirstName || "General";
        if (!categoriesByParent[parent]) {
          categoriesByParent[parent] = [];
        }
        categoriesByParent[parent].push(cat);
      }

      const parentNames = Object.keys(categoriesByParent);
      logMessage(`Found ${parentNames.length} major root categories: ${parentNames.join(", ")}`);

      // Loop through each root category
      for (const parent of parentNames) {
        const subCats = categoriesByParent[parent];
        const storeCat = mapToStoreCategory(parent, "");
        logMessage(`=== Processing Parent Category: ${parent} (Mapping to Store Category: ${storeCat}) ===`);

        let categoryImported = 0;
        // Shuffle or select some subcategories to import from
        for (const sub of subCats) {
          if (categoryImported >= limitPerCategory) break;

          botState.currentCategory = `${parent} -> ${sub.categoryName}`;
          logMessage(`Querying products for subcategory: ${sub.categoryName} (ID: ${sub.categoryId})...`);

          let page = 1;
          const pageSize = 50;
          let consecutiveEmptyPages = 0;

          while (categoryImported < limitPerCategory && consecutiveEmptyPages < 2) {
            logMessage(`Fetching page ${page} of subcategory ${sub.categoryName}...`);
            let productsResult;
            try {
              productsResult = await getCJProductsByCategory(sub.categoryId, page, pageSize);
            } catch (err: any) {
              logMessage(`Error fetching subcategory ${sub.categoryName} page ${page}: ${err.message}`);
              break;
            }

            const products = productsResult.list || [];
            if (products.length === 0) {
              consecutiveEmptyPages++;
              page++;
              continue;
            }
            consecutiveEmptyPages = 0;

            logMessage(`Retrieved ${products.length} products. Starting import process...`);

            for (const product of products) {
              if (categoryImported >= limitPerCategory) break;

              try {
                const costPrice = parseFloat(product.sellPrice || "0");
                if (costPrice <= 0) {
                  botState.skippedCount++;
                  continue;
                }

                // Check if already exists in DB
                const existing = await db.select().from(menuItems).where(eq(menuItems.cjPid, product.pid));
                if (existing.length > 0) {
                  // Backfill gallery/video if missing from previous imports
                  if (!existing[0].galleryImages && !existing[0].videoUrl) {
                    try {
                      const detail = await getCJProductDetail(product.pid);
                      let vid = existing[0].cjVid;
                      if (detail.variants?.length > 0 && !vid) {
                        vid = detail.variants[0].vid;
                      }
                      let galleryImages: string | null = null;
                      if (detail.productImageSet && detail.productImageSet.length > 0) {
                        galleryImages = JSON.stringify(detail.productImageSet);
                      }
                      await storage.updateMenuItem(existing[0].id, {
                        galleryImages,
                        videoUrl: null,
                        cjVid: vid,
                      });
                      logMessage(`Backfilled gallery for existing item: ${product.productNameEn}`);
                    } catch (e) {
                      // ignore backfill errors
                    }
                  }
                  botState.skippedCount++;
                  continue; // Skip duplicates
                }

                const sellPrice = (costPrice * (1 + Number(markup) / 100)).toFixed(2);

                // Fetch variants, gallery images, and video for details
                let vid: string | null = null;
                let galleryImages: string | null = null;
                let videoUrl: string | null = null; // Always null as requested
                try {
                  const detail = await getCJProductDetail(product.pid);
                  if (detail.variants?.length > 0) {
                    vid = detail.variants[0].vid;
                  }
                  if (detail.productImageSet && detail.productImageSet.length > 0) {
                    galleryImages = JSON.stringify(detail.productImageSet);
                  }
                } catch {
                  // Ignore details failure
                }

                await storage.createMenuItem({
                  name: product.productNameEn,
                  description: `${product.productNameEn} — Sourced from ${sub.categoryName}`,
                  price: sellPrice,
                  imageUrl: product.productImage || null,
                  category: storeCat,
                  cjPid: product.pid,
                  cjVid: vid,
                  cjCost: costPrice.toFixed(2),
                  galleryImages,
                  videoUrl,
                  isAvailable: 1,
                  isTop: 0,
                });

                botState.importedCount++;
                categoryImported++;

                // Log every 10 imports to prevent log flooding
                if (botState.importedCount % 10 === 0) {
                  logMessage(`Imported ${botState.importedCount} total products so far.`);
                }

                // 200ms delay to avoid API rate limits
                await new Promise(r => setTimeout(r, 200));
              } catch (err: any) {
                botState.skippedCount++;
                botState.errors.push(`${product.productNameEn}: ${err.message}`);
              }
            }

            page++;
            // Don't request too many pages per subcategory
            if (page > 3) break;
          }
        }

        logMessage(`Finished parent category ${parent}. Imported ${categoryImported} products.`);
      }

      logMessage("=============================================");
      logMessage(`Bot run completed successfully!`);
      logMessage(`Total Imported: ${botState.importedCount}`);
      logMessage(`Total Skipped/Duplicates: ${botState.skippedCount}`);
      logMessage("=============================================");

      botState.running = false;
      botState.lastRun = new Date();
      botState.currentCategory = "";
    } catch (globalErr: any) {
      logMessage(`Fatal bot error: ${globalErr.message}`);
      botState.running = false;
      botState.lastRun = new Date();
      botState.currentCategory = "";
    }
  })();
}
