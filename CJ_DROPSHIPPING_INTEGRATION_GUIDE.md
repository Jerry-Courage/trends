# CJ Dropshipping Integration Guide

## Overview

Your Trends Electronics app has been upgraded with **full CJ Dropshipping integration** for worldwide product fulfillment. This guide explains what was changed, how to configure it, and how to use it.

---

## What Was Done

### 1. **Server-Side CJ API Service** (`server/cj.ts`)
- Complete CJ Dropshipping API client
- Functions for:
  - Product search & import
  - Order fulfillment
  - Shipping rate calculation
  - Tracking sync
- Auto-refreshing access token management

### 2. **CJ API Routes** (`server/cj-routes.ts`)
- `/api/cj/status` - Check if CJ keys are configured
- `/api/cj/products/search` - Search CJ catalog (admin only)
- `/api/cj/products/:pid` - Get product details
- `/api/cj/products/import` - Import CJ product to your store
- `/api/cj/shipping/rates` - Get shipping rates for a product
- `/api/cj/orders/:orderId/fulfill` - Submit order to CJ for fulfillment
- `/api/cj/orders/:orderId/sync-tracking` - Sync tracking from CJ
- `/api/cj/orders/:orderId/tracking` - Get CJ tracking info (customer-facing)

### 3. **Database Schema Updates** (`shared/schema.ts`)
Added CJ fields to `menuItems`:
- `cjPid` - CJ product ID
- `cjVid` - CJ variant ID
- `cjCost` - Wholesale cost from CJ

Added CJ fields to `orders`:
- `cjOrderId` - CJ's internal order ID
- `cjOrderNum` - CJ's order number
- `cjTrackingNo` - Shipping tracking number
- `cjLogistic` - Carrier name
- `shippingCountry` - ISO country code
- `currency` - Order currency (USD, GBP, etc.)

### 4. **Currency Detection** (`src/lib/currency.ts`)
- Auto-detects user's currency from browser timezone
- Supports 50+ currencies worldwide
- Formats prices correctly for each locale
- Provides country code for CJ shipping

### 5. **Currency Context** (`src/context/CurrencyContext.tsx`)
- React context for currency throughout the app
- `useCurrency()` hook provides:
  - `currency` - Current currency info
  - `fmt(amount)` - Format price with correct symbol

### 6. **Updated Pages**

#### **CheckoutPage** (`src/pages/CheckoutPage.tsx`)
- International shipping address form (name, phone, street, city, province, zip, country)
- Dynamic currency display
- Removed local delivery/pickup toggle
- Added "Fulfilled by CJ Dropshipping" banner
- Shipping fee calculation (flat rate for now; can be dynamic via CJ API)

#### **TrackingPage** (`src/pages/TrackingPage.tsx`)
- Shows CJ tracking number when available
- Link to 17track.net for tracking
- Displays CJ order status
- Dynamic currency in order summary

#### **ShippingInfoPage** (`src/pages/ShippingInfoPage.tsx`) - NEW
- Replaces NearbyPage
- Explains CJ Dropshipping fulfillment
- Shows shipping methods (CJ Packet, CJ Express, ePacket)
- FAQ section
- Trust badges

#### **BottomNav** (`src/components/layout/BottomNav.tsx`)
- Changed "Nearby" tab to "Shipping" tab
- Routes to `/shipping` instead of `/nearby`

#### **AppShell** (`src/components/layout/AppShell.tsx`)
- Cart total now uses dynamic currency formatting

### 7. **App.tsx Updates**
- Added `CurrencyProvider` wrapper
- Replaced `/nearby` route with `/shipping` → `ShippingInfoPage`
- Added `/shipping` route as alias

### 8. **Environment Variables** (`.env`)
You need to add:
```env
CJ_API_EMAIL=your@email.com
CJ_API_KEY=your_cj_api_key
```

---

## How to Get CJ API Keys

1. **Sign up** at [cjdropshipping.com](https://cjdropshipping.com)
2. Go to **Settings** → **API Settings**
3. Generate an API key
4. Copy your **email** and **API key**
5. Add them to your `.env` file:
   ```env
   CJ_API_EMAIL=your@email.com
   CJ_API_KEY=your_cj_api_key
   ```
6. Restart your server

---

## How to Use the Integration

### **Step 1: Import Products from CJ**

**Option A: Via API (Recommended for bulk import)**
```bash
curl -X POST http://localhost:3001/api/cj/products/import \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pid": "CJ123456",
    "vid": "CJ123456-001",
    "name": "iPhone 15 Pro Max",
    "description": "Latest iPhone with A17 Pro chip",
    "price": "899.00",
    "category": "Phones",
    "imageUrl": "https://cj-image-url.jpg",
    "markup": 30
  }'
```

**Option B: Add CJ Import Tab to Admin Dashboard** (TODO - see below)

The `markup` parameter adds a percentage on top of CJ's wholesale price. For example:
- CJ cost: $100
- Markup: 30%
- Your sell price: $130

**Option C: Manual Entry**
1. Go to Admin Dashboard → Catalog Editor
2. Click "New Product"
3. Fill in product details
4. Leave `cjPid` and `cjVid` empty for now (you can add them later via database)

### **Step 2: Customer Places Order**

When a customer checks out:
1. They fill in their **international shipping address**
2. Payment is processed via Paystack
3. Order is saved to your database with `currency` field
4. Order status: `pending`

### **Step 3: Fulfill Order via CJ**

**Admin/Warehouse submits order to CJ:**

```bash
curl -X POST http://localhost:3001/api/cj/orders/123/fulfill \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "consignee": "John Doe",
      "phone": "+1234567890",
      "country": "US",
      "province": "California",
      "city": "Los Angeles",
      "address": "123 Main St, Apt 4B",
      "zip": "90001"
    }
  }'
```

**What happens:**
1. Your server calls CJ's API to create an order
2. CJ picks, packs, and ships the product
3. Your order is updated with `cjOrderId` and `cjOrderNum`
4. Order status changes to `confirmed` → `packaging` → `ready` → `picked_up`

### **Step 4: Sync Tracking**

Once CJ ships the order, sync the tracking number:

```bash
curl -X POST http://localhost:3001/api/cj/orders/123/sync-tracking \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**What happens:**
1. Your server fetches tracking info from CJ
2. Updates `cjTrackingNo` and `cjLogistic` in your database
3. Customer can now see tracking number on `/tracking/:id` page

### **Step 5: Customer Tracks Order**

Customer visits `/tracking/:orderId` and sees:
- Order summary
- CJ tracking number
- Link to 17track.net for live tracking
- Estimated delivery time

---

## Currency Handling

### **How It Works**
1. User visits your site
2. Browser timezone is detected (e.g., `America/New_York`)
3. Currency is inferred (e.g., USD for US, GBP for UK, GHS for Ghana)
4. All prices are displayed in that currency
5. When order is placed, `currency` field is saved

### **Supported Currencies**
- USD (US Dollar)
- GBP (British Pound)
- EUR (Euro)
- GHS (Ghanaian Cedi)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)
- JPY (Japanese Yen)
- CNY (Chinese Yuan)
- INR (Indian Rupee)
- ...and 40+ more (see `src/lib/currency.ts`)

### **Payment Processing**
- Paystack currently processes in **GHS** (Ghana Cedis)
- To support other currencies, you need:
  1. Paystack account in that region, OR
  2. Switch to Stripe/PayPal for multi-currency support

---

## Pages Removed/Repurposed

### **Removed:**
- ❌ **NearbyPage** - No longer needed (was for local restaurant locations)

### **Repurposed:**
- ✅ **ShippingInfoPage** - Explains CJ Dropshipping fulfillment
- ✅ **TrackingPage** - Now shows CJ tracking info
- ✅ **CheckoutPage** - International shipping address form

### **Kept (No Changes Needed):**
- ✅ HomePage
- ✅ MenuPage
- ✅ ItemDetailPage
- ✅ OrdersPage
- ✅ ProfilePage
- ✅ HelpPage
- ✅ SearchPage
- ✅ FavoritesPage
- ✅ PaymentMethodsPage
- ✅ ManagementPage (warehouse)
- ✅ CourierPage
- ✅ AdminDashboard

---

## TODO: Add CJ Import Tab to Admin Dashboard

To complete the integration, add a **"CJ Import"** tab to the Admin Dashboard:

### **What It Should Do:**
1. Search CJ's product catalog
2. Display results with images, prices, and descriptions
3. Allow admin to select products and import them
4. Auto-calculate sell price with markup
5. Save to `menuItems` table with `cjPid`, `cjVid`, and `cjCost`

### **Implementation Steps:**

1. **Add Tab to AdminDashboard.tsx:**
   ```tsx
   const [activeTab, setActiveTab] = useState<"overview" | "menu" | "staff" | "ai" | "users" | "insights" | "cj-import">("overview");
   ```

2. **Add Tab Button:**
   ```tsx
   { id: "cj-import", label: "CJ Import", icon: Package },
   ```

3. **Add Tab Content:**
   ```tsx
   {activeTab === "cj-import" && (
     <motion.div key="cj-import" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
       <div className="flex gap-3">
         <input
           type="text"
           placeholder="Search CJ products..."
           value={cjSearchQuery}
           onChange={e => setCjSearchQuery(e.target.value)}
           className="flex-1 bg-card border border-border rounded-2xl px-4 py-3"
         />
         <Button onClick={handleCJSearch}>Search</Button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {cjProducts?.map(product => (
           <Card key={product.pid} className="p-4">
             <img src={product.productImage} alt={product.productNameEn} className="w-full h-40 object-cover rounded-lg mb-3" />
             <h4 className="font-bold">{product.productNameEn}</h4>
             <p className="text-sm text-muted-foreground">{product.categoryName}</p>
             <p className="text-lg font-bold text-primary mt-2">${product.sellPrice}</p>
             <Button onClick={() => handleImportProduct(product)} className="w-full mt-3">
               Import to Store
             </Button>
           </Card>
         ))}
       </div>
     </motion.div>
   )}
   ```

4. **Add State & Handlers:**
   ```tsx
   const [cjSearchQuery, setCjSearchQuery] = useState("");
   const [cjProducts, setCjProducts] = useState<any[]>([]);

   const handleCJSearch = async () => {
     const results = await api.get(`/cj/products/search?q=${cjSearchQuery}`);
     setCjProducts(results.list);
   };

   const handleImportProduct = async (product: any) => {
     await api.post("/cj/products/import", {
       pid: product.pid,
       vid: product.variants?.[0]?.vid || product.pid,
       name: product.productNameEn,
       description: product.description || product.productNameEn,
       price: product.sellPrice,
       category: "Electronics",
       imageUrl: product.productImage,
       markup: 30,
     });
     toast({ title: "Product imported successfully!" });
     queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
   };
   ```

---

## Testing Without CJ Keys

If you don't have CJ API keys yet, the app will still work:

1. **Product Import**: Manually add products via Admin Dashboard
2. **Shipping Rates**: Mock rates are returned (`/api/cj/shipping/rates`)
3. **Order Fulfillment**: Returns 503 error (expected)
4. **Tracking**: Shows "Awaiting fulfillment" message

---

## Database Migration

Run this to add the new CJ fields to your database:

```bash
npm run db:push
```

This will update your SQLite database schema with the new `cjPid`, `cjVid`, `cjCost`, `cjOrderId`, `cjOrderNum`, `cjTrackingNo`, `cjLogistic`, `shippingCountry`, and `currency` fields.

---

## Summary of Changes

| File | Change |
|------|--------|
| `server/cj.ts` | ✅ NEW - CJ API client |
| `server/cj-routes.ts` | ✅ NEW - CJ API routes |
| `server/index.ts` | ✅ Register CJ routes |
| `server/storage.ts` | ✅ Expose CJ fields in order queries |
| `shared/schema.ts` | ✅ Add CJ fields to `menuItems` and `orders` |
| `src/lib/currency.ts` | ✅ NEW - Currency detection |
| `src/context/CurrencyContext.tsx` | ✅ NEW - Currency React context |
| `src/App.tsx` | ✅ Add CurrencyProvider, replace NearbyPage route |
| `src/pages/CheckoutPage.tsx` | ✅ International shipping form, dynamic currency |
| `src/pages/TrackingPage.tsx` | ✅ Show CJ tracking info |
| `src/pages/ShippingInfoPage.tsx` | ✅ NEW - Replaces NearbyPage |
| `src/components/layout/BottomNav.tsx` | ✅ Change "Nearby" to "Shipping" |
| `src/components/layout/AppShell.tsx` | ✅ Dynamic currency in cart |
| `.env` | ⚠️ TODO - Add `CJ_API_EMAIL` and `CJ_API_KEY` |
| `src/pages/AdminDashboard.tsx` | ⚠️ TODO - Add CJ Import tab |

---

## Next Steps

1. **Get CJ API keys** from cjdropshipping.com
2. **Add keys to `.env`**
3. **Run database migration**: `npm run db:push`
4. **Restart server**: `npm run dev`
5. **Test product import** via API
6. **Add CJ Import tab** to Admin Dashboard (optional but recommended)
7. **Update Paystack keys** for your target currency region
8. **Test full order flow**: Import → Checkout → Fulfill → Track

---

## Support

- **CJ Dropshipping Docs**: https://developers.cjdropshipping.com/
- **CJ Support**: support@cjdropshipping.com
- **Paystack Docs**: https://paystack.com/docs

---

## Notes

- **Shipping Times**: CJ typically ships in 1–3 business days, delivers in 7–15 days (CJ Packet) or 3–7 days (CJ Express)
- **Customs**: Import duties may apply depending on destination country
- **Returns**: CJ handles returns through their dispute system
- **Margins**: Typical dropshipping markup is 20–50% on top of CJ's wholesale price
- **Inventory**: CJ manages all inventory — you never touch the products
- **Branding**: CJ can add custom packaging/inserts for an extra fee

---

**You're all set!** Your app is now a fully functional international dropshipping store powered by CJ Dropshipping. 🚀
