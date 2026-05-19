# Trends Electronics App

A full-stack Chinese food delivery application with customer ordering, kitchen management, rider delivery tracking, and a Super Admin dashboard.

## Architecture

**Frontend**: React + Vite (port 5000)
**Backend**: Express.js (port 3001, proxied via Vite)
**Database**: SQLite (via Drizzle ORM + better-sqlite3)
**Real-time**: WebSockets (ws library on backend, SocketContext on frontend)
**AI**: OpenRouter (gpt-4o-mini) for recommendations, ETA, kitchen briefing, search, admin insights

## User Roles

| Role | Portal | Access |
|---|---|---|
| `customer` | Main app (/) | Browse menu, place orders, track delivery, profile |
| `kitchen` | /management | View all orders, update status, assign riders |
| `rider` | /rider | See assigned orders, mark picked up/delivered |
| `admin` | /admin | Full dashboard — stats, menu editor, staff management, AI insights |

## Key Files

- `shared/schema.ts` — Drizzle schema (users, orders, order_items, menu_items)
- `server/index.ts` — Express entry point + SQLite seed (menu items + admin account)
- `server/routes.ts` — All API routes
- `server/storage.ts` — Database access layer (IStorage interface + Storage class)
- `server/db.ts` — Drizzle/SQLite connection
- `server/ai.ts` — All OpenRouter AI functions
- `src/context/AuthContext.tsx` — JWT auth (localStorage) + updateUser()
- `src/lib/api.ts` — Fetch wrapper with auth headers (get/post/patch/delete)
- `src/pages/MenuPage.tsx` — Live menu from API (not static data)
- `src/pages/ItemDetailPage.tsx` — Item detail from API
- `src/pages/HomePage.tsx` — Live AI recs + real last order from API
- `src/pages/AdminDashboard.tsx` — Full admin: overview, menu CRUD, staff, AI insights
- `src/pages/ProfilePage.tsx` — Profile with working Edit modal (name/phone/address)
- `public/assets/` — Menu item images served statically (referenced by DB imageUrl paths)

## Workflows

- **Start application**: `npm run dev` (Vite frontend on :5000)
- **Backend**: `npx tsx server/index.ts` (Express API on :3001)

## API Routes

```
POST  /api/auth/register            — Create account (customer/kitchen/rider)
POST  /api/auth/login               — Login, returns JWT
GET   /api/auth/me                  — Get current user
PATCH /api/auth/profile             — Update name/phone/address

GET   /api/menu                     — All available menu items

POST  /api/orders                   — Place order (customer)
GET   /api/orders/my                — Customer's orders (includes items[])
GET   /api/orders/:id               — Single order

PATCH /api/management/orders/:id/status  — Update order status (kitchen)
PATCH /api/management/orders/:id/assign  — Assign rider
GET   /api/management/riders              — List all riders

PATCH /api/rider/orders/:id/status  — Mark picked_up or delivered

GET   /api/admin/stats              — Revenue, orders, popular items, activeUsers
GET   /api/admin/menu-items         — All menu items (admin/kitchen)
POST  /api/admin/menu-items         — Add dish (admin)
PATCH /api/admin/menu-items/:id     — Edit dish (admin/kitchen)
DELETE /api/admin/menu-items/:id    — Delete dish (admin)
GET   /api/admin/staff              — List kitchen staff
POST  /api/admin/staff              — Create kitchen/rider account
DELETE /api/admin/staff/:id         — Remove staff

POST  /api/ai/search                — AI-powered menu search (text fallback if AI down)
POST  /api/ai/recommendations       — 4 personalized dish picks
POST  /api/ai/admin-insights        — 30-day business strategy (text fallback if AI down)
GET   /api/ai/eta/:orderId          — Delivery ETA estimate
GET   /api/ai/kitchen-summary       — Kitchen briefing for active orders
```

## Order Status Flow

`pending` → `confirmed` → `preparing` → `ready` → `assigned` → `picked_up` → `delivered`

- Kitchen advances: pending → confirmed → preparing → ready
- Kitchen assigns rider: ready → assigned
- Rider marks: assigned → picked_up → delivered

## Seeded Accounts (auto-created on first run)

- **Admin**: `admin@trends.ink` / `trends-admin-2025`
- (Self-register customers and riders via the app)

## Environment Variables

- `OPENROUTER_API_KEY` — Required for AI features (graceful fallback if absent)
- `JWT_SECRET` — JWT signing secret
- `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` — Payment gateway (not yet configured)

## AI Features

All AI features degrade gracefully if the API key is missing or the call fails:
- **Search**: Falls back to simple text matching on name/description/category
- **Admin Insights**: Falls back to a statistical summary from DB data
- **Recommendations/ETA/Kitchen Summary**: Return helpful fallback messages

## Notes

- Menu items use numeric DB IDs. Frontend maps them to string IDs for CartContext compatibility.
- Images are stored in `public/assets/` and referenced in the DB as `/assets/filename.jpg`.
- WebSocket events: `order_update`, `new_order`, `rider_location` broadcast to all clients.
