# PrimeGearStore

Fullstack app with Next.js App Router and layered architecture:

- Store area: `/store`, `/checkout`, `/orders/[orderNumber]`
- Admin area: `/admin`

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL with existing schemas:
  - `inventory`
  - `webstore`

## Environment

`.env`:

```env
DATABASE_URL="postgresql://postgres:0110@localhost:5432/sales_inventory_db"
```

## Commands

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run lint:fix`
- `npm run format`
- `npm run format:write`
- `npm run prisma:generate`
- `npm run prisma:validate`
- `npm run test`
- `npm run test:watch`
- `npm run test:e2e`

## Architecture

1. Route Handlers (`src/app/api/**/route.ts`)
   - Input parsing and Zod validation.
   - Delegates business logic to services.
2. Services (`src/modules/**/service.ts`)
   - Business rules and orchestration.
   - Checkout/cancel uses Prisma transaction for atomicity.
3. Repositories (`src/modules/**/repo.ts`)
   - Prisma queries only.

Shared libs:

- `src/lib/db/prisma.ts`
- `src/lib/errors/app-error.ts`
- `src/lib/errors/http.ts`
- `src/lib/validators/parse.ts`

## Implemented APIs

- `GET /api/store/catalog`
- `POST /api/store/cart/items`
- `POST /api/store/checkout`
- `GET /api/store/orders/[orderNumber]`
- `POST /api/store/orders/[orderNumber]/cancel`
- `POST /api/admin/products`

## Checkout behavior (Sprint 2)

- Validates cart is `OPEN` and has items.
- Resolves current default price from `inventory.product_prices` + `inventory.price_lists`.
- Creates `webstore.orders` with `PENDING_PAYMENT`.
- Creates `webstore.order_items` with price snapshots.
- Creates `webstore.stock_reservations` with `ACTIVE` and `expires_at = now + 30 min`.
- Marks cart as `CHECKED_OUT`.
- Reads order again to return trigger-recalculated totals.

## Curl examples

Create cart item:

```bash
curl -X POST http://localhost:3000/api/store/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "sess-abc-123",
    "productId": 1,
    "quantity": 2
  }'
```

Checkout:

```bash
curl -X POST http://localhost:3000/api/store/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "cartId": "REPLACE_WITH_CART_UUID",
    "customerId": 1,
    "branchId": 1,
    "notes": "Checkout from API"
  }'
```

Get order by order number:

```bash
curl http://localhost:3000/api/store/orders/PG-20260216-123456789123
```

Cancel order:

```bash
curl -X POST http://localhost:3000/api/store/orders/PG-20260216-123456789123/cancel
```
