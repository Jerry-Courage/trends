/**
 * CJ Dropshipping API Service
 * Docs: https://developers.cjdropshipping.com/
 *
 * Set these in your .env:
 *   CJ_API_EMAIL=your@email.com
 *   CJ_API_KEY=your_cj_api_key
 */

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0";

let _accessToken: string | null = null;
let _tokenExpiry = 0;

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  if (_accessToken && Date.now() < _tokenExpiry) return _accessToken;

  const email = process.env.CJ_API_EMAIL;
  const key = process.env.CJ_API_KEY;

  if (!email || !key) {
    throw new Error("CJ_API_EMAIL and CJ_API_KEY must be set in .env");
  }

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: key }),
  });

  const data = (await res.json()) as {
    code: number;
    result: boolean;
    message: string;
    data?: { accessToken: string; accessTokenExpiryDate: string; refreshToken: string };
  };

  if (!data.result || !data.data?.accessToken) {
    throw new Error(`CJ Auth failed: ${data.message}`);
  }

  _accessToken = data.data.accessToken;
  // Expire 5 minutes before actual expiry to be safe
  _tokenExpiry = new Date(data.data.accessTokenExpiryDate).getTime() - 5 * 60 * 1000;
  return _accessToken;
}

async function cjFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${CJ_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();
  if (!data.result) {
    throw new Error(`CJ API error: ${data.message || JSON.stringify(data)}`);
  }
  return data.data as T;
}

// ─── Product Search ───────────────────────────────────────────────────────────

export interface CJProduct {
  pid: string;
  productNameEn: string;
  productImage: string;
  sellPrice: number;
  categoryName: string;
  description?: string;
  variants?: CJVariant[];
}

export interface CJVariant {
  vid: string;
  variantNameEn: string;
  variantSellPrice: number;
  variantImage?: string;
}

export async function searchCJProducts(
  keyword: string,
  page = 1,
  pageSize = 20
): Promise<{ list: CJProduct[]; total: number }> {
  const data = await cjFetch<{ list: CJProduct[]; total: number }>(
    `/product/list?productNameEn=${encodeURIComponent(keyword)}&pageNum=${page}&pageSize=${pageSize}`
  );
  return data;
}

export async function getCJProductDetail(pid: string): Promise<CJProduct> {
  const data = await cjFetch<CJProduct>(`/product/query?pid=${pid}`);
  return data;
}

// ─── Order Fulfillment ────────────────────────────────────────────────────────

export interface CJOrderItem {
  vid: string;       // CJ variant ID
  quantity: number;
}

export interface CJShippingAddress {
  consignee: string;
  phone: string;
  country: string;   // ISO 2-letter code e.g. "US", "GB"
  province: string;
  city: string;
  address: string;
  zip: string;
}

export interface CJOrderResult {
  orderId: string;
  orderNum: string;
  status: string;
}

export async function createCJOrder(
  referenceNo: string,
  shippingAddress: CJShippingAddress,
  items: CJOrderItem[],
  shippingMethod = "CJPacket"
): Promise<CJOrderResult> {
  const data = await cjFetch<CJOrderResult>("/shopping/order/createOrder", {
    method: "POST",
    body: {
      orderNumber: referenceNo,
      shippingZip: shippingAddress.zip,
      shippingCountry: shippingAddress.country,
      shippingProvince: shippingAddress.province,
      shippingCity: shippingAddress.city,
      shippingAddress: shippingAddress.address,
      shippingCustomerName: shippingAddress.consignee,
      shippingPhone: shippingAddress.phone,
      shippingMethod,
      products: items.map(i => ({ vid: i.vid, quantity: i.quantity })),
    },
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
  pid: string,
  country: string,
  quantity = 1
): Promise<CJShippingRate[]> {
  const data = await cjFetch<CJShippingRate[]>(
    `/logistic/freightCalculate?pid=${pid}&country=${country}&quantity=${quantity}`
  );
  return Array.isArray(data) ? data : [];
}

// ─── Order Tracking ───────────────────────────────────────────────────────────

export interface CJTrackingInfo {
  orderNum: string;
  trackNumber: string;
  logisticName: string;
  status: string;
  trackingDetails?: { time: string; content: string }[];
}

export async function getCJOrderTracking(cjOrderId: string): Promise<CJTrackingInfo> {
  const data = await cjFetch<CJTrackingInfo>(`/shopping/order/getOrderDetail?orderId=${cjOrderId}`);
  return data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Check if CJ keys are configured */
export function isCJConfigured(): boolean {
  return !!(process.env.CJ_API_EMAIL && process.env.CJ_API_KEY);
}
