/**
 * CJ Dropshipping API Service
 * Docs: https://developers.cjdropshipping.com/
 *
 * Set these in your .env / Render environment:
 *   CJ_API_EMAIL=your@email.com   (used as fallback)
 *   CJ_API_KEY=your_cj_api_key
 */

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

let _accessToken: string | null = null;
let _tokenExpiry = 0;

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  if (_accessToken && Date.now() < _tokenExpiry) return _accessToken;

  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) throw new Error("CJ_API_KEY must be set in environment variables");

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });

  if (!res.ok) {
    throw new Error(`CJ Auth HTTP error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    code: number;
    result: boolean;
    message: string;
    data?: {
      accessToken: string;
      accessTokenExpiryDate: string;
      refreshToken: string;
      refreshTokenExpiryDate: string;
    };
  };

  if (!data.result || !data.data?.accessToken) {
    throw new Error(`CJ Auth failed: ${data.message}`);
  }

  _accessToken = data.data.accessToken;
  // Expire 10 minutes before actual expiry to be safe
  _tokenExpiry = new Date(data.data.accessTokenExpiryDate).getTime() - 10 * 60 * 1000;
  return _accessToken;
}

async function cjFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, string | number | boolean> } = {}
): Promise<T> {
  const token = await getAccessToken();

  let url = `${CJ_BASE}${path}`;
  if (options.params) {
    const qs = new URLSearchParams(
      Object.entries(options.params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)])
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`CJ API HTTP error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as { result: boolean; message: string; data: T };
  if (!data.result) {
    throw new Error(`CJ API error: ${data.message}`);
  }
  return data.data;
}

// ─── Product Search ───────────────────────────────────────────────────────────

export interface CJProduct {
  pid: string;
  productNameEn: string;
  productImage: string;
  sellPrice: string;
  categoryName: string;
  categoryId: string;
  productSku: string;
  listedNum: number;
  addMarkStatus: number; // 1 = free shipping
}

export interface CJProductDetail extends CJProduct {
  description: string;
  variants: CJVariant[];
  productImageSet: string[];
  suggestSellPrice: string;
}

export interface CJVariant {
  vid: string;
  variantNameEn: string;
  variantSellPrice: number;
  variantImage: string;
  variantSku: string;
  variantKey: string;
}

export async function searchCJProducts(
  keyword: string,
  page = 1,
  pageSize = 20
): Promise<{ list: CJProduct[]; total: number }> {
  const data = await cjFetch<{ list: CJProduct[]; total: number; pageNum: number; pageSize: number }>(
    "/product/list",
    {
      params: {
        productNameEn: keyword,
        pageNum: page,
        pageSize: Math.min(pageSize, 200),
      },
    }
  );

  const list = data.list || [];

  // Filter client-side: only keep products whose name contains at least one keyword word
  const words = keyword.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const filtered = words.length > 0
    ? list.filter(p => {
        const name = p.productNameEn.toLowerCase();
        return words.some(w => name.includes(w));
      })
    : list;

  return { list: filtered, total: filtered.length };
}

// Fetch products by category ID (no keyword needed)
export async function getCJProductsByCategory(
  categoryId: string,
  page = 1,
  pageSize = 50
): Promise<{ list: CJProduct[]; total: number }> {
  const data = await cjFetch<{ list: CJProduct[]; total: number }>(
    "/product/list",
    {
      params: {
        categoryId,
        pageNum: page,
        pageSize: Math.min(pageSize, 200),
        orderBy: "listedNum", // most listed = most popular
        sort: "desc",
      },
    }
  );
  return { list: data.list || [], total: data.total || 0 };
}

// Fetch CJ category list
export interface CJCategory {
  categoryId: string;
  categoryName: string;
  categoryFirstName?: string;
}

export async function getCJCategories(): Promise<CJCategory[]> {
  try {
    const data = await cjFetch<any[]>("/product/getCategory");
    // Flatten the nested category structure into a simple list
    const flat: CJCategory[] = [];
    for (const first of (data || [])) {
      for (const second of (first.categoryFirstList || [])) {
        for (const third of (second.categorySecondList || [])) {
          flat.push({
            categoryId: third.categoryId,
            categoryName: third.categoryName,
            categoryFirstName: first.categoryFirstName,
          });
        }
      }
    }
    return flat;
  } catch {
    return [];
  }
}

export async function getCJProductDetail(pid: string): Promise<CJProductDetail> {
  const data = await cjFetch<CJProductDetail>("/product/query", {
    params: { pid },
  });
  return data;
}

// ─── Shipping Rates ───────────────────────────────────────────────────────────

export interface CJShippingRate {
  logisticName: string;
  logisticAbbreviation: string;
  logisticPrice: number;
  estimateDeliveryDays: string;
}

export async function getCJShippingRates(
  vid: string,
  country: string,
  quantity = 1
): Promise<CJShippingRate[]> {
  try {
    const data = await cjFetch<CJShippingRate[]>("/logistic/freightCalculate", {
      params: { vid, country, quantity },
    });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ─── Order Fulfillment ────────────────────────────────────────────────────────

export interface CJOrderItem {
  vid: string;
  quantity: number;
}

export interface CJShippingAddress {
  consignee: string;
  phone: string;
  country: string;
  province: string;
  city: string;
  address: string;
  zip: string;
}

export interface CJOrderResult {
  orderId: string;
  orderNumber: string;  // V2 returns orderNumber
  orderNum?: string;    // legacy fallback
}

export async function createCJOrder(
  referenceNo: string,
  shippingAddress: CJShippingAddress,
  items: CJOrderItem[],
  shippingMethod = "CJPacket"
): Promise<CJOrderResult> {
  const data = await cjFetch<CJOrderResult>("/shopping/order/createOrderV2", {
    method: "POST",
    body: {
      orderNumber: referenceNo,
      shippingZip: shippingAddress.zip || "",
      shippingCountryCode: shippingAddress.country,   // required: 2-letter ISO code e.g. "US"
      shippingCountry: shippingAddress.country,        // country name or code
      shippingProvince: shippingAddress.province || shippingAddress.city,
      shippingCity: shippingAddress.city,
      shippingAddress: shippingAddress.address,
      shippingCustomerName: shippingAddress.consignee,
      shippingPhone: shippingAddress.phone || "",
      logisticName: shippingMethod,                    // required
      fromCountryCode: "CN",                           // required: CJ ships from China
      payType: 3,                                      // 3 = create order only, no auto-payment
      products: items.map(i => ({ vid: i.vid, quantity: i.quantity })),
    },
  });
  return data;
}

// ─── Order Tracking ───────────────────────────────────────────────────────────

export interface CJTrackingInfo {
  orderId: string;
  orderNum: string;
  trackNumber: string;
  logisticName: string;
  orderStatus: string;
  trackingUrl?: string;
}

export async function getCJOrderTracking(cjOrderId: string): Promise<CJTrackingInfo> {
  const data = await cjFetch<CJTrackingInfo>("/shopping/order/getOrderDetail", {
    params: { orderId: cjOrderId },
  });
  return data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isCJConfigured(): boolean {
  return !!(process.env.CJ_API_KEY);
}
