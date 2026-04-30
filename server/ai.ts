const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";

const MODELS = [
  "gemma-3-27b-it",
  "gemma-3-12b-it",
  "gemma-3-4b-it",
  "gemma-3-1b-it"
];

// Track rate-limited models with a cooldown timestamp
const rateLimitedUntil: Record<string, number> = {};
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// Trends Electronics Hub (Accra Mall)
export const WAREHOUSE_LOCATION = { lat: 5.6201, lng: -0.1740 };

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

function getKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("### AI_ERROR: GEMINI_API_KEY is not set in the environment!");
    throw new Error("GEMINI_API_KEY not set");
  }
  return key;
}

function getAvailableModels(): string[] {
  const now = Date.now();
  return MODELS.filter(m => !rateLimitedUntil[m] || rateLimitedUntil[m] < now);
}

async function chat(messages: Message[]): Promise<string> {
  const key = getKey();

  let systemText = "";
  const contents: any[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemText += msg.content + "\n\n";
    } else if (msg.role === "user") {
      const text = contents.length === 0 && systemText ? systemText + msg.content : msg.content;
      contents.push({ role: "user", parts: [{ text }] });
    } else if (msg.role === "assistant") {
      contents.push({ role: "model", parts: [{ text: msg.content }] });
    }
  }

  if (contents.length === 0 && systemText) {
    contents.push({ role: "user", parts: [{ text: systemText }] });
  }

  let lastError: any = null;
  const available = getAvailableModels();

  if (available.length === 0) {
    // All models are rate-limited — clear cooldowns and try again from the top
    Object.keys(rateLimitedUntil).forEach(k => delete rateLimitedUntil[k]);
    available.push(...MODELS);
  }

  for (const modelId of available) {
    try {
      console.log(`### AI Request (${modelId})`);
      const res = await fetch(`${BASE_URL}${modelId}:generateContent?key=${key}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: 250,
            temperature: 0.7,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        const status = res.status;
        console.warn(`### AI ${modelId} failed (${status}): ${errText.slice(0, 200)}`);

        // Rate limited — put this model in cooldown and move to next
        if (status === 429 || status === 402 || status === 403 || status === 503 || status === 404) {
          rateLimitedUntil[modelId] = Date.now() + COOLDOWN_MS;
          console.log(`### Model ${modelId} rate-limited or unavailable, cooling down for 10min`);
          lastError = new Error(`Rate limited or unavailable on ${modelId}`);
          continue;
        }

        // For other errors (5xx) just skip this model
        lastError = new Error(`Error ${status} on ${modelId}`);
        continue;
      }

      const data = await res.json() as any;
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        console.log(`### AI success via ${modelId}`);
        return content;
      }

      lastError = new Error(`Empty response from ${modelId}`);
    } catch (err: any) {
      console.warn(`### AI ${modelId} network error:`, err.message);
      lastError = err;
      continue;
    }
  }

  const errorMessage = lastError ? lastError.message : "All AI models failed";
  console.error(`### AI_FATAL: ${errorMessage}`);
  throw lastError || new Error("All AI models failed");
}

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
    .map(i => `ID:${i.id} "${i.name}" (${i.category}, $${i.price}${i.tags?.length ? ", " + i.tags.join("/") : ""})`)
    .join("\n");

  const historyText = recentOrders.length > 0
    ? recentOrders.slice(0, 3).map(o => o.items.map(i => i.name).join(", ")).join(" | ")
    : "No previous orders";

  const prompt = `Menu:
${menuText}
Orders: ${historyText}
Time: ${timeOfDay}
Interests/Preferences: ${interests || "None"}. DO NOT recommend any products violating these preferences.
Respond with 4 best JSON recommendations only: [{"id":"1","name":"Item","reason":"reason","confidence":0.95}]`;

  const response = await chat([
    { role: "system", content: "You are a tech product recommender. Respond with JSON arrays only." },
    { role: "user", content: prompt },
  ]);

  try {
    const cleaned = response.trim().replace(/^```json\n?|```$/g, "");
    return JSON.parse(cleaned);
  } catch {
    return menuItems.slice(0, 4).map(i => ({
      id: String(i.id),
      name: i.name,
      reason: "Popular choice",
      confidence: 0.8,
    }));
  }
}

export async function getOrderETA(
  status: string,
  createdAt: Date,
  itemCount: number
): Promise<{ minutes: number; message: string }> {
  const minutesSinceOrder = Math.floor((Date.now() - createdAt.getTime()) / 60000);

  const prompt = `You are an AI delivery time estimator for a tech retail store.
Order: status="${status}", placed ${minutesSinceOrder} min ago, ${itemCount} items.
Estimate remaining delivery time. Respond with valid JSON only: {"minutes":15,"message":"Your gadgets are being secured for transport!"}`;

  const response = await chat([
    { role: "system", content: "You are a delivery ETA AI. Respond with valid JSON only." },
    { role: "user", content: prompt },
  ]);

  try {
    const cleaned = response.trim().replace(/^```json\n?|```$/g, "");
    return JSON.parse(cleaned);
  } catch {
    const fallbacks: Record<string, { minutes: number; message: string }> = {
      pending: { minutes: 35, message: "Order received! Processing your tech request." },
      confirmed: { minutes: 28, message: "Inventory confirmed! Preparing for dispatch." },
      packaging: { minutes: 20, message: "Your gadgets are being carefully packed!" },
      ready: { minutes: 12, message: "Order is ready for the courier!" },
      assigned: { minutes: 10, message: "Courier is arriving at the warehouse!" },
      picked_up: { minutes: 8, message: "Your order is out for delivery!" },
      delivered: { minutes: 0, message: "Order delivered. Power on and enjoy!" },
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

  const prompt = `Warehouse assistant at Trends Electronics. Active orders:\n${ordersText}\nGive a 1-2 sentence briefing. Flag orders waiting >15 min. Be concise.`;

  const response = await chat([
    { role: "system", content: "You are a warehouse operations assistant. Be brief and actionable." },
    { role: "user", content: prompt },
  ]);

  return response.trim() || "All orders looking good. Keep up the great work!";
}

export async function searchMenu(
  query: string,
  menuItems: { id: number; name: string; category: string; price: string; description: string; tags: string[] | null }[]
): Promise<{ message: string; itemIds: number[] }> {
  const menuText = menuItems
    .map(i => `ID:${i.id} "${i.name}" (${i.category}, $${i.price}) - ${i.description}${i.tags?.length ? " [" + i.tags.join(", ") + "]" : ""}`)
    .join("\n");

  const prompt = `Menu:\n${menuText}\nQuery: "${query}"\nRespond with best matches as valid JSON only: {"message":"Msg","itemIds":[1,3]}`;

  const response = await chat([
    { role: "system", content: "You are a tech retail assistant. Always respond with valid JSON only." },
    { role: "user", content: prompt },
  ]);

  try {
    const cleaned = response.trim().replace(/^```json\n?|```$/g, "");
    return JSON.parse(cleaned);
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
  const recentRevenue = stats.revenue.slice(-7).map(r => `$${r.amount}`).join(", ");

  const prompt = `Business consultant for Trends Electronics.
30-Day: Revenue=$${stats.totalRevenue.toFixed(2)}, Orders=${stats.totalOrders}, Top items: ${popularText}, Last 7 days revenue: ${recentRevenue}.
Give a professional 2-3 sentence strategic insight.`;

  const response = await chat([
    { role: "system", content: "You are a strategic business analyst for a retail store. Be concise and insightful." },
    { role: "user", content: prompt },
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
  
  // 1. Categorize intent
  const techKeywords = ["shop", "recommend", "buy", "product", "gadget", "device", "phone", "laptop", "audio", "watch", "gaming", "accessories", "price", "cost", "warranty", "spec", "stock"];
  const trackingKeywords = ["where", "track", "status", "courier", "courier", "delivery", "arrival", "eta", "location", "coming", "package"];
  
  const hasTechIntent = techKeywords.some(word => query.includes(word));
  const hasTrackingIntent = trackingKeywords.some(word => query.includes(word));

  const menuText = hasTechIntent && menuItems.length > 0 
    ? menuItems.map(i => `ID:${i.id} "${i.name}" ($${i.price}) - ${i.category}. ${i.description}${i.tags?.length ? " [" + i.tags.join(", ") + "]" : ""}`).join("\n")
    : "";

  const orderContext = activeOrders.length > 0 
    ? activeOrders.map(o => {
        const items = o.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ");
        const courierLoc = o.courierLat && o.courierLng ? `Courier at [${o.courierLat}, ${o.courierLng}]` : "Courier location unknown";
        const restLoc = `Warehouse at [${WAREHOUSE_LOCATION.lat}, ${WAREHOUSE_LOCATION.lng}]`;
        const custLoc = o.customerLat && o.customerLng ? `Customer at [${o.customerLat}, ${o.customerLng}]` : "Customer location unknown";
        return `Order #${o.id}: Status=${o.status}. Items: ${items}. ${courierLoc}. ${restLoc}. ${custLoc}.`;
      }).join("\n")
    : "No active orders for this user.";

  let systemPrompt: string;

  if (hasTrackingIntent && activeOrders.length > 0) {
    systemPrompt = `You are Trends Electronics' elite logistics coordinator.
Goal: Provide a precise update on the user's package using the TRACKING CONTEXT below.
Coordinates: Translate [lat, lng] into human-friendly terms relative to the warehouse and customer.
Note: If the courier is closer to the customer than the warehouse, say they're "on the home stretch".
Tone: Informed, professional, and very brief (under 30 words).

TRACKING CONTEXT:
${orderContext}`;
  } else if (hasTechIntent) {
    systemPrompt = `You are Trends Electronics' elite tech concierge. 
Goal: Provide a complete tech setup recommendation (Device + Accessories) using the PRODUCT DATA below.
Requirement: You MUST use [PRODUCT:id] tags for every item you mention to generate interactive cards.
Interests: Strictly align with "${interests || "None recognized"}".
Tone: Helpful, tech-savvy, and very brief (under 30 words).

MENU DATA:
${menuText}`;
  } else {
    systemPrompt = `You are Trends Electronics' friendly AI assistant.
Goal: Handle greetings and general chat warmly.
Note: You don't have the product catalog open right now. If the user wants to see gadgets or the store, encourage them to ask specifically for "recommendations" or "the store".
Tone: Professional "Trends" persona. Tech-savvy and very short (under 20 words).`;
  }

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userQuery },
  ];

  return chat(messages);
}
