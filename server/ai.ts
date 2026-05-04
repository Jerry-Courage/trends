// Model IDs exactly as they appear in Google AI Studio
// gemma-3 models → v1beta, support systemInstruction
// gemini-2.0 models → v1beta, support systemInstruction
const MODELS = [
  { id: "gemini-2.0-flash",      base: "https://generativelanguage.googleapis.com/v1beta/models/", supportsSystemInstruction: true },
  { id: "gemini-2.0-flash-lite", base: "https://generativelanguage.googleapis.com/v1beta/models/", supportsSystemInstruction: true },
  { id: "gemma-3-27b-it",        base: "https://generativelanguage.googleapis.com/v1beta/models/", supportsSystemInstruction: true },
  { id: "gemma-3-12b-it",        base: "https://generativelanguage.googleapis.com/v1beta/models/", supportsSystemInstruction: true },
  { id: "gemma-3-4b-it",         base: "https://generativelanguage.googleapis.com/v1beta/models/", supportsSystemInstruction: true },
  { id: "gemma-3-1b-it",         base: "https://generativelanguage.googleapis.com/v1beta/models/", supportsSystemInstruction: true },
];

const rateLimitedUntil: Record<string, number> = {};
const COOLDOWN_MS = 60 * 1000;        // 1 minute cooldown for 429s
const HARD_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes for 403/404

export const WAREHOUSE_LOCATION = { lat: 5.6201, lng: -0.1740 };

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

function getKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return key;
}

function getAvailableModels() {
  const now = Date.now();
  const available = MODELS.filter(m => !rateLimitedUntil[m.id] || rateLimitedUntil[m.id] < now);
  if (available.length === 0) {
    // All rate-limited — reset and try again
    MODELS.forEach(m => delete rateLimitedUntil[m.id]);
    return [...MODELS];
  }
  return available;
}

async function chat(messages: Message[]): Promise<string> {
  const key = getKey();

  // Separate system prompt from conversation
  let systemText = "";
  const contents: any[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemText += msg.content + "\n\n";
    } else if (msg.role === "user") {
      contents.push({ role: "user", parts: [{ text: msg.content }] });
    } else if (msg.role === "assistant") {
      contents.push({ role: "model", parts: [{ text: msg.content }] });
    }
  }

  // Must have at least one user turn
  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: systemText || "Hello" }] });
    systemText = "";
  }

  let lastError: any = null;

  for (const model of getAvailableModels()) {
    try {
      console.log(`### AI Request (${model.id})`);

      const requestBody: any = {
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
      };

      if (model.supportsSystemInstruction && systemText.trim()) {
        // v1beta: use systemInstruction field
        requestBody.systemInstruction = { parts: [{ text: systemText.trim() }] };
        requestBody.contents = contents;
      } else if (systemText.trim()) {
        // v1: prepend system text into the first user message
        const merged = [...contents];
        if (merged.length > 0 && merged[0].role === "user") {
          merged[0] = { role: "user", parts: [{ text: systemText.trim() + "\n\n" + merged[0].parts[0].text }] };
        }
        requestBody.contents = merged;
      } else {
        requestBody.contents = contents;
      }

      const res = await fetch(`${model.base}${model.id}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errText = await res.text();
        const status = res.status;
        console.warn(`### AI ${model.id} failed (${status}): ${errText.slice(0, 200)}`);

        if ([429, 503].includes(status)) {
          rateLimitedUntil[model.id] = Date.now() + COOLDOWN_MS;
          lastError = new Error(`Model ${model.id} rate limited (${status})`);
          continue;
        }
        if ([402, 403, 404].includes(status)) {
          rateLimitedUntil[model.id] = Date.now() + HARD_COOLDOWN_MS;
          lastError = new Error(`Model ${model.id} unavailable (${status})`);
          continue;
        }

        lastError = new Error(`Error ${status} on ${model.id}`);
        continue;
      }

      const data = await res.json() as any;
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        console.log(`### AI success via ${model.id}`);
        return content;
      }

      lastError = new Error(`Empty response from ${model.id}`);
    } catch (err: any) {
      console.warn(`### AI ${model.id} network error:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("All AI models failed");
}

// ─── Exported AI Functions ────────────────────────────────────────────────────

export interface RecommendationItem {
  id: string;
  name: string;
  reason: string;
  confidence: number;
}

export async function getRecommendations(
  menuItems: { id: number; name: string; category: string; price: string; tags: string[] | null }[],
  recentOrders: { items: { name: string }[] }[],
  timeOfDay: "morning" | "afternoon" | "evening" | "night",
  interests?: string | null
): Promise<RecommendationItem[]> {
  const menuText = menuItems
    .map(i => `ID:${i.id} "${i.name}" (${i.category}, ${i.price}${i.tags?.length ? ", " + i.tags.join("/") : ""})`)
    .join("\n");

  const historyText = recentOrders.length > 0
    ? recentOrders.slice(0, 3).map(o => o.items.map(i => i.name).join(", ")).join(" | ")
    : "No previous orders";

  const prompt = `Menu:\n${menuText}\nOrders: ${historyText}\nTime: ${timeOfDay}\nInterests: ${interests || "None"}.\nRespond with 4 best JSON recommendations only: [{"id":"1","name":"Item","reason":"reason","confidence":0.95}]`;

  const response = await chat([
    { role: "system", content: "You are a tech product recommender. Respond with JSON arrays only." },
    { role: "user", content: prompt },
  ]);

  try {
    const cleaned = response.trim().replace(/^```json\n?|```$/g, "");
    return JSON.parse(cleaned);
  } catch {
    return menuItems.slice(0, 4).map(i => ({
      id: String(i.id), name: i.name, reason: "Popular choice", confidence: 0.8,
    }));
  }
}

export async function getOrderETA(
  status: string,
  createdAt: Date,
  itemCount: number
): Promise<{ minutes: number; message: string }> {
  const minutesSinceOrder = Math.floor((Date.now() - createdAt.getTime()) / 60000);
  const prompt = `Order: status="${status}", placed ${minutesSinceOrder} min ago, ${itemCount} items. Estimate remaining delivery time. Respond with valid JSON only: {"minutes":15,"message":"Your gadgets are being secured for transport!"}`;

  const response = await chat([
    { role: "system", content: "You are a delivery ETA AI. Respond with valid JSON only." },
    { role: "user", content: prompt },
  ]);

  try {
    return JSON.parse(response.trim().replace(/^```json\n?|```$/g, ""));
  } catch {
    const fallbacks: Record<string, { minutes: number; message: string }> = {
      pending:   { minutes: 35, message: "Order received! Processing your tech request." },
      confirmed: { minutes: 28, message: "Inventory confirmed! Preparing for dispatch." },
      packaging: { minutes: 20, message: "Your gadgets are being carefully packed!" },
      ready:     { minutes: 12, message: "Order is ready for the courier!" },
      assigned:  { minutes: 10, message: "Courier is arriving at the warehouse!" },
      picked_up: { minutes: 8,  message: "Your order is out for delivery!" },
      delivered: { minutes: 0,  message: "Order delivered. Power on and enjoy!" },
    };
    return fallbacks[status] ?? { minutes: 20, message: "On the way!" };
  }
}

export async function getWarehouseSummary(
  orders: { id: number; status: string; createdAt: Date; items: { name: string; quantity: number }[] }[]
): Promise<string> {
  if (orders.length === 0) return "No active orders right now. Enjoy the quiet!";
  const filtered = orders.filter(o => o && !["delivered", "cancelled"].includes(o.status)).slice(0, 10);
  if (filtered.length === 0) return "No active orders to report. Great time to prep for the next rush!";

  const ordersText = filtered.map(o => {
    const age = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000);
    const items = (o.items || []).map(i => `${i.quantity}× ${i.name}`).join(", ");
    return `Order #${String(o.id).padStart(5, "0")} [${o.status}, ${age}min ago]: ${items}`;
  }).join("\n");

  const response = await chat([
    { role: "system", content: "You are a warehouse operations assistant. Be brief and actionable." },
    { role: "user", content: `Active orders:\n${ordersText}\nGive a 1-2 sentence briefing. Flag orders waiting >15 min.` },
  ]);

  return response.trim() || "All orders looking good. Keep up the great work!";
}

export async function searchMenu(
  query: string,
  menuItems: { id: number; name: string; category: string; price: string; description: string; tags: string[] | null }[]
): Promise<{ message: string; itemIds: number[] }> {
  const menuText = menuItems
    .map(i => `ID:${i.id} "${i.name}" (${i.category}, ${i.price}) - ${i.description}${i.tags?.length ? " [" + i.tags.join(", ") + "]" : ""}`)
    .join("\n");

  const response = await chat([
    { role: "system", content: "You are a tech retail assistant. Always respond with valid JSON only." },
    { role: "user", content: `Menu:\n${menuText}\nQuery: "${query}"\nRespond: {"message":"Msg","itemIds":[1,3]}` },
  ]);

  try {
    return JSON.parse(response.trim().replace(/^```json\n?|```$/g, ""));
  } catch {
    return { message: "Here are some items you might enjoy!", itemIds: menuItems.slice(0, 3).map(i => i.id) };
  }
}

export async function getAdminInsights(
  stats: {
    revenue: { date: string; amount: number }[];
    orders: { date: string; count: number }[];
    popularItems: { name: string; count: number }[];
    totalRevenue: number;
    totalOrders: number;
  }
): Promise<string> {
  const popularText = stats.popularItems.map(i => `${i.name} (${i.count} sold)`).join(", ");
  const recentRevenue = stats.revenue.slice(-7).map(r => `${r.amount}`).join(", ");

  const response = await chat([
    { role: "system", content: "You are a strategic business analyst for a retail store. Be concise and insightful." },
    { role: "user", content: `30-Day: Revenue=${stats.totalRevenue.toFixed(2)}, Orders=${stats.totalOrders}, Top items: ${popularText}, Last 7 days revenue: ${recentRevenue}. Give a professional 2-3 sentence strategic insight.` },
  ]);

  return response.trim() || "Performance is steady. Focus on maintaining quality and speed.";
}

export async function getSupportResponse(
  userQuery: string,
  history: Message[] = [],
  menuItems: { id: number; name: string; category: string; price: string; description: string; tags: string[] | null }[] = [],
  interests?: string | null,
  activeOrders: (any & { items: any[] })[] = []
): Promise<string> {
  const query = userQuery.toLowerCase();
  const techKeywords = ["shop", "recommend", "buy", "product", "gadget", "device", "phone", "laptop", "audio", "watch", "gaming", "accessories", "price", "cost", "warranty", "spec", "stock"];
  const trackingKeywords = ["where", "track", "status", "delivery", "arrival", "eta", "location", "coming", "package"];

  const hasTechIntent = techKeywords.some(w => query.includes(w));
  const hasTrackingIntent = trackingKeywords.some(w => query.includes(w));

  const menuText = hasTechIntent && menuItems.length > 0
    ? menuItems.map(i => `ID:${i.id} "${i.name}" (${i.price}) - ${i.category}. ${i.description}${i.tags?.length ? " [" + i.tags.join(", ") + "]" : ""}`).join("\n")
    : "";

  const orderContext = activeOrders.length > 0
    ? activeOrders.map(o => {
        const items = o.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ");
        return `Order #${o.id}: Status=${o.status}. Items: ${items}.`;
      }).join("\n")
    : "No active orders.";

  let systemPrompt: string;

  if (hasTrackingIntent && activeOrders.length > 0) {
    systemPrompt = `You are Trends Electronics' support assistant. Give a brief order status update using: ${orderContext}. Be under 30 words.`;
  } else if (hasTechIntent) {
    systemPrompt = `You are Trends Electronics' tech concierge. Recommend products from this catalog using [PRODUCT:id] tags. Interests: "${interests || "None"}". Be brief (under 30 words).\n\nCATALOG:\n${menuText}`;
  } else {
    systemPrompt = `You are Trends Electronics' friendly AI assistant. Handle greetings warmly. Be very short (under 20 words).`;
  }

  return chat([
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userQuery },
  ]);
}
