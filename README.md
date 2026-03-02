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
AUTH_SECRET="replace-with-long-random-secret"
AUTH_USERS_JSON='[{"email":"admin@primegear.local","passwordHash":"$2b$10$...","role":"ADMIN","name":"Admin"},{"email":"staff@primegear.local","passwordHash":"$2b$10$...","role":"STAFF","name":"Staff"},{"email":"customer@primegear.local","passwordHash":"$2b$10$...","role":"CUSTOMER","name":"Customer"}]'
LOG_LEVEL="info"
MERCADOPAGO_ACCESS_TOKEN="APP_USR-xxxxxxxx"
MERCADOPAGO_WEBHOOK_SECRET="mp-webhook-secret-if-enabled"
PUBLIC_BASE_URL="https://your-domain.com"
EMAIL_PROVIDER="console"
RESEND_API_KEY=""
EMAIL_FROM="PrimeGearStore <noreply@primegear.local>"
```

Alternative dedicated auth env vars (if not using `AUTH_USERS_JSON`):

```env
AUTH_ADMIN_EMAIL="admin@primegear.local"
AUTH_ADMIN_PASSWORD_HASH="$2b$10$..."
AUTH_STAFF_EMAIL="staff@primegear.local"
AUTH_STAFF_PASSWORD_HASH="$2b$10$..."
AUTH_CUSTOMER_EMAIL="customer@primegear.local"
AUTH_CUSTOMER_PASSWORD_HASH="$2b$10$..."
```

Generate a password hash:

```bash
node -e "require('bcryptjs').hash('your_password', 10).then(h => console.log(h))"
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

## Auth + RBAC (Sprint 5)

- Auth.js (NextAuth) configured with Credentials provider:
  - `src/auth.ts`
  - `src/app/api/auth/[...nextauth]/route.ts`
- Roles:
  - `ADMIN`
  - `STAFF`
  - `CUSTOMER`
- Middleware authorization:
  - Protects `/admin/*` and `/api/admin/*`
  - `/api/admin/jobs/*` is restricted to `ADMIN` only
- Middleware injects `x-request-id` for traceability.
- Structured logger with `pino`:
  - `src/lib/logger.ts`
- Error responses include `requestId` and hide internal stack traces.

## Implemented APIs

- `GET /api/store/catalog`
- `POST /api/store/cart/items`
- `POST /api/store/checkout`
- `GET /api/store/orders/[orderNumber]`
- `POST /api/store/orders/[orderNumber]/cancel`
- `POST /api/store/payments/mock/approve`
- `POST /api/store/payments/webhook`
- `POST /api/store/payments/mercadopago/init`
- `POST /api/store/payments/mercadopago/webhook`
- `POST /api/admin/products`
- `POST /api/admin/purchases`
- `POST /api/admin/inventory/adjust`
- `GET /api/admin/inventory/stock`
- `GET /api/admin/reports/sales/daily`
- `GET /api/admin/reports/top-products`
- `POST /api/admin/jobs/expire-reservations`
- `POST /api/admin/jobs/process-outbox`
- `GET /api/admin/orders`
- `GET /api/admin/orders/[orderNumber]`
- `POST /api/admin/orders/[orderNumber]/reconcile-payment`
- `POST /api/admin/orders/[orderNumber]/cancel`
- `PATCH /api/admin/orders/[orderNumber]/status`
- `POST /api/admin/orders/[orderNumber]/shipment`
- `PATCH /api/admin/orders/[orderNumber]/shipment`
- `GET /api/admin/exports/orders.csv`
- `GET /api/admin/exports/sales.csv`
- `GET /api/admin/exports/stock.csv`

## Checkout behavior (Sprint 2)

- Validates cart is `OPEN` and has items.
- Resolves current default price from `inventory.product_prices` + `inventory.price_lists`.
- Creates `webstore.orders` with `PENDING_PAYMENT`.
- Creates `webstore.order_items` with price snapshots.
- Creates `webstore.stock_reservations` with `ACTIVE` and `expires_at = now + 30 min`.
- Marks cart as `CHECKED_OUT`.
- Reads order again to return trigger-recalculated totals.

## Payments and confirmation (Sprint 3)

- Records payment events in `webstore.order_payments`.
- Supports `MOCK` provider in:
  - `POST /api/store/payments/mock/approve`
  - `POST /api/store/payments/webhook`
- Uses idempotent order-to-sale conversion inside a transaction:
  - `webstore.orders.status => PAID`
  - creates `inventory.sales`
  - creates `inventory.sale_items`
  - creates `inventory.sale_payments`
  - creates `inventory.inventory_movements` (OUT)
  - marks `webstore.stock_reservations` ACTIVE => CONSUMED
- Links order to sale using `inventory.sales.notes`:
  - `webstore_order_id=<id>; order_number=<order_number>`

## Purchases, stock, and reports (Sprint 4)

- Purchases (`POST /api/admin/purchases`):
  - Creates `inventory.purchases`
  - Creates `inventory.purchase_items`
  - Creates `inventory.inventory_movements` with `movement_type=IN`
  - Uses a single transaction.
- Inventory adjustments (`POST /api/admin/inventory/adjust`):
  - Uses `movement_type=IN` or `movement_type=OUT` (direction-based).
  - Keeps `quantity` positive to satisfy DB check constraints.
  - Stores reason in `reference_table` as `ADJUST: <reason>` truncated to max length.
- Stock (`GET /api/admin/inventory/stock`):
  - Calculates `stock_on_hand` from movement aggregation by product + branch.
- Reports:
  - `GET /api/admin/reports/sales/daily`
- `GET /api/admin/reports/top-products`

## Mercado Pago Checkout Pro (Sprint 6)

- `POST /api/store/payments/mercadopago/init`
  - Crea preference para una `order` en `PENDING_PAYMENT`.
  - Guarda `order_payments` (`provider=MERCADOPAGO`, `status=INITIATED`, `provider_ref=preferenceId`).
  - Devuelve `initPoint` para redireccionar al checkout de Mercado Pago.
- `POST /api/store/payments/mercadopago/webhook`
  - Valida firma cuando es posible (`x-signature` + secret).
  - Consulta recurso real en Mercado Pago (`payments` o `merchant_orders`) para no confiar en payload ciego.
  - Registra/upserta evento en `order_payments`.
  - Si queda `APPROVED`, ejecuta confirmación idempotente `order -> sale`.
- Redirect UX pages:
  - `/payments/success`
  - `/payments/failure`
  - `/payments/pending`
- Estas páginas no modifican DB.

## Admin Orders + Reconciliation (Sprint 7)

- Admin pages:
  - `/admin/orders`
  - `/admin/orders/[orderNumber]`
- Payment reconciliation endpoint:
  - `POST /api/admin/orders/[orderNumber]/reconcile-payment`
  - Consulta estado real en Mercado Pago por `external_reference=orderNumber`.
  - Registra/actualiza `order_payments`.
  - Si queda `APPROVED`, garantiza conversión idempotente `order -> sale`.
- Order actions:
  - `POST /api/admin/orders/[orderNumber]/cancel`
  - `PATCH /api/admin/orders/[orderNumber]/status` (`PACKING | SHIPPED | DELIVERED`)
- Expiration job:
  - `POST /api/admin/jobs/expire-reservations`
  - Expira reservas vencidas, cancela orders pendientes relacionadas, y marca carritos OPEN viejos como ABANDONED.

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

Simulate approved payment (MOCK):

```bash
curl -X POST http://localhost:3000/api/store/payments/mock/approve \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "PG-20260216-123456789123",
    "amount": "120000.00"
  }'
```

Verify order has payment + sale + inventory movements:

```bash
curl http://localhost:3000/api/store/orders/PG-20260216-123456789123
```

Expected in response:

- `data.status` should be `PAID`
- `data.payment.status` should be `APPROVED`
- `data.sale.saleId` should exist
- `data.sale.movementOutCount` should be greater than `0`

Create purchase (IN movements):

```bash
curl -X POST http://localhost:3000/api/admin/purchases \
  -H "Content-Type: application/json" \
  -d '{
    "supplierId": 1,
    "branchId": 1,
    "currency": "COP",
    "items": [
      { "productId": 1, "quantity": 5, "unitCost": 10000 },
      { "productId": 2, "quantity": 2, "unitCost": 25000 }
    ]
  }'
```

Create stock adjustment:

```bash
curl -X POST http://localhost:3000/api/admin/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": 1,
    "productId": 1,
    "quantity": 1,
    "direction": "OUT",
    "unitCost": 0,
    "reason": "Conteo fisico"
  }'
```

Get stock snapshot:

```bash
curl "http://localhost:3000/api/admin/inventory/stock?branchId=1&search=&limit=20&offset=0"
```

Daily sales report:

```bash
curl "http://localhost:3000/api/admin/reports/sales/daily?from=2026-02-01&to=2026-02-28"
```

Top products report:

```bash
curl "http://localhost:3000/api/admin/reports/top-products?from=2026-02-01&to=2026-02-28&limit=10"
```

Login (get session cookie):

```bash
curl -c cookie.txt -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@primegear.local&password=your_password"
```

Protected admin endpoint with session cookie:

```bash
curl -b cookie.txt "http://localhost:3000/api/admin/inventory/stock?limit=20&offset=0"
```

Expire reservations job (ADMIN only):

```bash
curl -X POST -b cookie.txt http://localhost:3000/api/admin/jobs/expire-reservations
```

Reconcile payment (ADMIN/STAFF):

```bash
curl -X POST -b cookie.txt \
  -H "Content-Type: application/json" \
  -d '{}' \
  http://localhost:3000/api/admin/orders/PG-20260216-123456789123/reconcile-payment
```

Force reconcile (allows cancel rule on declined payments):

```bash
curl -X POST -b cookie.txt \
  -H "Content-Type: application/json" \
  -d '{"force": true}' \
  http://localhost:3000/api/admin/orders/PG-20260216-123456789123/reconcile-payment
```

Init Mercado Pago preference:

```bash
curl -X POST http://localhost:3000/api/store/payments/mercadopago/init \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "PG-20260216-123456789123"
  }'
```

Webhook simulation (local/manual):

```bash
curl -X POST "http://localhost:3000/api/store/payments/mercadopago/webhook?type=payment&data.id=123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": { "id": "123456789" }
  }'
```

En producción, Mercado Pago invoca automáticamente este webhook; la simulación manual es solo para pruebas.

Create shipment (admin):

```bash
curl -X POST -b cookie.txt http://localhost:3000/api/admin/orders/PG-20260216-123456789123/shipment \
  -H "Content-Type: application/json" \
  -d '{
    "carrier": "DHL",
    "service": "Express",
    "trackingNumber": "DHL-ABC-123"
  }'
```

Mark order as PACKING:

```bash
curl -X PATCH -b cookie.txt http://localhost:3000/api/admin/orders/PG-20260216-123456789123/status \
  -H "Content-Type: application/json" \
  -d '{"status":"PACKING"}'
```

Mark order as SHIPPED:

```bash
curl -X PATCH -b cookie.txt http://localhost:3000/api/admin/orders/PG-20260216-123456789123/status \
  -H "Content-Type: application/json" \
  -d '{"status":"SHIPPED"}'
```

Mark order as DELIVERED:

```bash
curl -X PATCH -b cookie.txt http://localhost:3000/api/admin/orders/PG-20260216-123456789123/status \
  -H "Content-Type: application/json" \
  -d '{"status":"DELIVERED"}'
```

## Notifications + Receipt + CSV (Sprint 9)

- Outbox table: `webstore.notification_outbox` (Prisma model + SQL migration manual).
- Events enqueued idempotently (unique by `event_type + order_id + channel`):
  - `ORDER_CREATED` (checkout)
  - `PAYMENT_APPROVED` (confirm order paid)
  - `ORDER_SHIPPED` (fulfillment)
  - `ORDER_DELIVERED` (fulfillment)
- Outbox processing job:
  - `POST /api/admin/jobs/process-outbox?limit=50`
  - `EMAIL_PROVIDER=console` logs email payloads using the app logger.
  - `EMAIL_PROVIDER=resend` is scaffolded (placeholder, TODO integration).
- Receipt page:
  - `/orders/[orderNumber]/receipt` (server-rendered, printable)
- CSV exports (ADMIN/STAFF):
  - `/api/admin/exports/orders.csv?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - `/api/admin/exports/sales.csv?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - `/api/admin/exports/stock.csv?branchId=1`

## Sprint 9 curl examples

Process notification outbox (ADMIN):

```bash
curl -X POST -b cookie.txt "http://localhost:3000/api/admin/jobs/process-outbox?limit=50"
```

Download orders CSV:

```bash
curl -L -b cookie.txt "http://localhost:3000/api/admin/exports/orders.csv?from=2026-02-01&to=2026-02-28" -o orders.csv
```

Download sales CSV:

```bash
curl -L -b cookie.txt "http://localhost:3000/api/admin/exports/sales.csv?from=2026-02-01&to=2026-02-28" -o sales.csv
```

Download stock CSV (all branches):

```bash
curl -L -b cookie.txt "http://localhost:3000/api/admin/exports/stock.csv" -o stock.csv
```

Run the notification outbox migration (manual SQL file):

```bash
# apply SQL in prisma/migrations/20260222_sprint9_notification_outbox/migration.sql
npm run prisma:generate
```

## SEO + Performance + Security + Observability (Sprint 10)

### SEO
- `GET /sitemap.xml` generado con rutas:
  - `/`
  - `/store`
  - `/store/products/[productId]` (productos activos)
- `GET /robots.txt` con `sitemap` y bloqueo de rutas admin/API sensibles.
- Metadata mejorada:
  - Store catalog (`/store`) metadata por layout de segmento.
  - Product detail (`/store/products/[productId]`) con title, description, canonical y OG image si existe.
- JSON-LD `Product` agregado en detalle de producto.

### Performance
- `GET /api/store/catalog` ahora soporta `search`, `limit`, `offset` y usa query SQL eficiente con joins/lateral para precio vigente + imagen principal (evita N+1 l�gico).
- `GET /api/store/catalog` responde con `ETag` + `Cache-Control`.
- Next Image habilitado con `remotePatterns` en `next.config.ts`.
- No se agregaron �ndices extra en Sprint 10 (los actuales fueron suficientes para no bloquear build/funcionalidad). Revisar con `EXPLAIN ANALYZE` en producci�n antes de tocar �ndices.

### Security
- Rate limiting en middleware (solo `/api/store/*`; admin no afectado):
  - provider por defecto en memoria (`RATE_LIMIT_PROVIDER=memory`)
  - placeholder preparado para Redis (`RATE_LIMIT_PROVIDER=redis`)
- Headers de seguridad en middleware:
  - `Content-Security-Policy` (simple)
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
- Webhook Mercado Pago endurecido:
  - valida `Content-Type`
  - valida `Content-Length` (max 256KB)
  - no expone headers sensibles en logs

### Observability
- `GET /api/health` retorna estado y timestamp, con check DB (`SELECT 1`) y timeout corto.
- Placeholder Sentry (`SENTRY_DSN`) preparado en `src/lib/observability/sentry.ts`.

### Rate limit env vars (opcionales)
```env
RATE_LIMIT_PROVIDER="memory"   # memory | redis (placeholder)
RATE_LIMIT_WINDOW_MS="60000"
RATE_LIMIT_STORE_LIMIT="120"
RATE_LIMIT_CATALOG_LIMIT="120"
RATE_LIMIT_CART_LIMIT="60"
RATE_LIMIT_CHECKOUT_LIMIT="20"
RATE_LIMIT_ORDERS_LIMIT="60"
RATE_LIMIT_PAYMENTS_LIMIT="30"
SENTRY_DSN=""
```

### Probar endpoints SEO/health
```bash
curl http://localhost:3000/robots.txt
curl http://localhost:3000/sitemap.xml
curl http://localhost:3000/api/health
```

### Probar rate limiting (ejemplo)
```bash
for i in {1..40}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/store/payments/webhook; done
```

### Catalog API (paginaci�n/filtros)
```bash
curl "http://localhost:3000/api/store/catalog?search=gear&limit=12&offset=0"
```

## SEO Slugs + Variants (Sprint 11A)

### Slugs SEO
- Nueva columna `inventory.products.slug` (nullable + unique).
- Endpoint admin para generar slugs:
  - `POST /api/admin/products/generate-slugs?limit=500`
- Reglas:
  - `slugify(name)`
  - resoluci�n de colisiones con sufijos (`-2`, `-3`, ...)
- Rutas de producto:
  - nueva canonical: `/products/[slug]`
  - compatibilidad: `/products/[id]` redirige 301 internamente si el producto tiene slug
  - compatibilidad legacy: `/store/products/[id]` redirige a `/products/[slug]`
- Sitemap ahora usa URLs con slug cuando existen.

### Variants (MVP backend)
- Tablas nuevas (schema `inventory`):
  - `product_variants`
  - `variant_prices`
  - `variant_inventory_movements`
- Cambios en webstore:
  - `webstore.cart_items.variant_id` (nullable)
  - `webstore.order_items.variant_id` (nullable)
- Store:
  - `GET /api/store/catalog?expand=variants` (opcional)
  - `GET /api/store/products/[slug]` incluye variantes activas + precio vigente por variante
  - `POST /api/store/cart/items` acepta `variantId`
  - checkout conserva compatibilidad sin variantes y persiste `variantId` en `order_items`
- Admin (API):
  - `GET|POST /api/admin/products/[productId]/variants`
  - `PATCH|DELETE /api/admin/products/[productId]/variants/[variantId]`
  - `GET|POST /api/admin/products/[productId]/variants/[variantId]/prices`

### Migraciones Sprint 11A (manual SQL)
Aplicar sobre la DB real con schemas `inventory` y `webstore` (por ejemplo `sales_inventory_db`):

```bash
psql -h localhost -p 5432 -U postgres -d sales_inventory_db -f prisma/migrations/20260222_sprint11a_product_slugs/migration.sql
psql -h localhost -p 5432 -U postgres -d sales_inventory_db -f prisma/migrations/20260222_sprint11a_product_variants/migration.sql
npm run prisma:generate
```

### Ejemplos curl � Slugs
```bash
curl -X POST -b cookie.txt "http://localhost:3000/api/admin/products/generate-slugs?limit=500"
curl http://localhost:3000/api/store/products/mi-producto-slug
curl -I http://localhost:3000/products/123
```

### Ejemplos curl � Variantes
Crear variante para producto 1:

```bash
curl -X POST -b cookie.txt http://localhost:3000/api/admin/products/1/variants \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "TSHIRT-BLK-M",
    "name": "Talla M / Negro",
    "attributes": { "size": "M", "color": "Black" },
    "isActive": true
  }'
```

Listar variantes:

```bash
curl -b cookie.txt http://localhost:3000/api/admin/products/1/variants
```

Crear precio de variante:

```bash
curl -X POST -b cookie.txt http://localhost:3000/api/admin/products/1/variants/1/prices \
  -H "Content-Type: application/json" \
  -d '{
    "priceListId": 1,
    "salePrice": 79900,
    "currency": "COP",
    "validFrom": "2026-02-22"
  }'
```

Catalogo con variantes:

```bash
curl "http://localhost:3000/api/store/catalog?expand=variants&limit=12&offset=0"
```

Agregar al carrito con variante:

```bash
curl -X POST http://localhost:3000/api/store/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "sess-variant-1",
    "productId": 1,
    "variantId": 1,
    "quantity": 1
  }'
```

## Coupons & Promotions (Sprint 11B)

### DB / Migraciones
Se agregaron:
- `webstore.coupons`
- `webstore.coupon_redemptions`
- `webstore.orders.coupon_code`

Aplicar migraci�n manual (DB real con schemas `inventory/webstore`):

```bash
psql -h localhost -p 5432 -U postgres -d sales_inventory_db -f prisma/migrations/20260222_sprint11b_coupons_promotions/migration.sql
npm run prisma:generate
```

### Reglas implementadas
- Validaci�n de cup�n en checkout:
  - `is_active`
  - ventana (`starts_at` / `ends_at`)
  - `min_subtotal`
  - `max_redemptions`
- Snapshot del descuento en checkout:
  - se guarda en `webstore.orders.discount_total`
  - `orders.total` se ajusta manualmente despu�s de crear `order_items`
  - `orders.coupon_code` se guarda (uppercase)
- Redenci�n definitiva al pago `APPROVED` (recomendado):
  - `coupon_redemptions` se crea en la transacci�n de `confirmOrderPaid`
  - `redeemed_count` se incrementa idempotentemente
  - `UNIQUE(order_id)` evita duplicados
- `inventory.sales.discount_total` se copia desde `webstore.orders.discount_total`

### Endpoints Store
- `POST /api/store/coupons/validate`
- `POST /api/store/checkout` (ahora acepta `couponCode`)

### Endpoints Admin (Cupones)
- `GET /api/admin/coupons`
- `POST /api/admin/coupons`
- `PATCH /api/admin/coupons/[code]` (activar/desactivar/editar)
- `GET /api/admin/coupons/[code]/redemptions`

### UI m�nima
- Admin: `/admin/coupons`
- Store checkout: `/checkout` (campo cup�n + bot�n validar)

### Curl examples � Cupones
Crear cup�n porcentaje:

```bash
curl -X POST -b cookie.txt http://localhost:3000/api/admin/coupons \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME10",
    "type": "PERCENT",
    "value": 10,
    "currency": "COP",
    "minSubtotal": 50000,
    "isActive": true
  }'
```

Validar cup�n contra carrito:

```bash
curl -X POST http://localhost:3000/api/store/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME10",
    "cartId": "REPLACE_WITH_CART_UUID"
  }'
```

Checkout con cup�n:

```bash
curl -X POST http://localhost:3000/api/store/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "cartId": "REPLACE_WITH_CART_UUID",
    "couponCode": "WELCOME10",
    "customerId": 1,
    "branchId": 1
  }'
```

Listar cupones:

```bash
curl -b cookie.txt http://localhost:3000/api/admin/coupons
```

Desactivar cup�n:

```bash
curl -X PATCH -b cookie.txt http://localhost:3000/api/admin/coupons/WELCOME10 \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

Ver redenciones de cup�n:

```bash
curl -b cookie.txt http://localhost:3000/api/admin/coupons/WELCOME10/redemptions
```

## Variants Production-Ready (Sprint 12)

### Regla de pricing de variante (decisi�n aplicada)
- Si el item del carrito usa `variantId`, **se exige precio vigente de variante** (`inventory.variant_prices` + `price_list default`).
- **No** se hace fallback al precio del producto para compras por variante.
- Si no hay precio vigente de variante: checkout/cart rechaza la operaci�n.

### Stock por variante (decisi�n aplicada)
- Checkout valida stock antes de reservar:
  - `stock_on_hand` desde `inventory.variant_inventory_movements`
  - menos reservas activas no expiradas en `webstore.stock_reservations`
- Si no alcanza stock para una variante, responde `409`.

### Migraci�n adicional Sprint 12
Agrega `variant_id` a `webstore.stock_reservations`.

```bash
psql -h localhost -p 5432 -U postgres -d sales_inventory_db -f prisma/migrations/20260222_sprint12_variants_stock_reservations/migration.sql
npm run prisma:generate
```

### APIs Store (variantes)
- `GET /api/store/products/[slug]?branchId=1`
  - devuelve variantes con precio vigente y stock (`stockOnHand`, `availableToSell`, `isInStock`)
- `POST /api/store/cart/items`
  - soporta `variantId` (y deriva `productId` si no se env�a)
- `POST /api/store/checkout`
  - crea `order_items.variant_id`
  - crea `stock_reservations.variant_id`

### APIs Admin (variantes)
- `GET|POST /api/admin/products/[productId]/variants`
- `PATCH /api/admin/variants/[variantId]`
- `POST /api/admin/variants/[variantId]/prices`
- `GET /api/admin/variants/stock?branchId=&search=&limit=&offset=`

### UI m�nima Sprint 12
- Store product detail (`/products/[slug]`): selector de variante + precio + stock/sin stock.
- Admin (`/admin/variants`):
  - panel por producto (crear/listar variantes)
  - asignar precio por variante
  - tabla stock por variante

### Curl examples � Variant stock/pricing/cart/checkout
Detalle de producto con stock de variantes (branch opcional):

```bash
curl "http://localhost:3000/api/store/products/mi-producto-slug?branchId=1"
```

Agregar item al carrito por variante (productId opcional si `variantId` existe):

```bash
curl -X POST http://localhost:3000/api/store/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "sess-v12-1",
    "variantId": 1,
    "quantity": 2
  }'
```

Checkout (valida stock y reservas por variante):

```bash
curl -X POST http://localhost:3000/api/store/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "cartId": "REPLACE_WITH_CART_UUID",
    "branchId": 1
  }'
```

Crear precio de variante (admin):

```bash
curl -X POST -b cookie.txt http://localhost:3000/api/admin/variants/1/prices \
  -H "Content-Type: application/json" \
  -d '{
    "priceListId": 1,
    "salePrice": 89900,
    "currency": "COP"
  }'
```

Ver stock por variante (admin):

```bash
curl -b cookie.txt "http://localhost:3000/api/admin/variants/stock?branchId=1&limit=20&offset=0"
```


## Real Costs (Sprint 13) - WAC + Profitability

### DB / Migracion
Se agrega tabla `inventory.variant_avg_cost` para costo promedio ponderado (WAC) por variante y branch (nullable/global).

Aplicar migracion manual:

```bash
psql -h localhost -p 5432 -U postgres -d sales_inventory_db -f prisma/migrations/20260222_sprint13_variant_avg_cost/migration.sql
npm run prisma:generate
```

### Regla WAC implementada
- WAC por variante (`inventory.product_variants`) y branch opcional.
- En compras con `variantId`, el backend:
  - registra `inventory.variant_inventory_movements` con `IN`
  - recalcula `variant_avg_cost` en la misma transaccion:
    - `new_avg = (old_qty*old_avg + in_qty*unit_cost) / (old_qty + in_qty)`
- En `confirmOrderPaid` / `order->sale`:
  - si `order_item.variant_id` existe, toma `avg_cost` (branch -> fallback global)
  - setea `inventory.sale_items.unit_cost`
  - crea `inventory.variant_inventory_movements` `OUT` con ese `unit_cost`
- Fallbacks de costo para venta (si falta WAC):
  - ultimo costo de entrada (`IN/RETURN_IN`) de la variante
  - si no existe historial, `unit_cost = 0` y warning en logs

### Limitaciones actuales (documentadas)
- COGS real implementado para lineas con `variantId`.
- Lineas de venta sin variante mantienen `unit_cost=0` (compatibilidad legado).
- `inventory.purchase_items` no guarda `variant_id`; el costo real por variante se soporta via `variant_inventory_movements` + `variant_avg_cost`.

### Endpoints de rentabilidad (admin)
- `GET /api/admin/reports/profit/daily?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/admin/reports/profit/top-variants?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=10`
- UI: `/admin/reports` (seccion de rentabilidad diaria + top variantes)

### Compras con variante (para alimentar WAC)
`POST /api/admin/purchases` ahora acepta `variantId` opcional por item.

```bash
curl -X POST -b cookie.txt http://localhost:3000/api/admin/purchases \
  -H "Content-Type: application/json" \
  -d '{
    "supplierId": 1,
    "branchId": 1,
    "currency": "COP",
    "items": [
      { "productId": 1, "variantId": "1", "quantity": 10, "unitCost": 45000 }
    ]
  }'
```

### Curl examples - Profitability
Reporte diario de margen bruto:

```bash
curl -b cookie.txt "http://localhost:3000/api/admin/reports/profit/daily?from=2026-02-01&to=2026-02-28"
```

Top variantes por utilidad:

```bash
curl -b cookie.txt "http://localhost:3000/api/admin/reports/profit/top-variants?from=2026-02-01&to=2026-02-28&limit=10"
```

## Conversion & Growth (Sprint 14)

### DB / Migracion
Sprint 14 agrega:
- `webstore.carts`: `last_activity_at`, `recovery_token`, `recovery_sent_at`, `applied_bundle_id`
- `webstore.bundles`
- `webstore.bundle_items`
- `webstore.events`
- `webstore.notification_outbox.cart_id` (y `order_id` nullable para soportar eventos de carrito)

Aplicar migracion manual:

```bash
psql -h localhost -p 5432 -U postgres -d sales_inventory_db -f prisma/migrations/20260222_sprint14_abandoned_recommendations_bundles/migration.sql
npm run prisma:generate
```

### Abandoned cart recovery
- `POST /api/admin/jobs/abandoned-carts?inactiveHours=24&limit=50`
- Busca carts `OPEN` inactivos y sin `recovery_sent_at`
- Genera `recovery_token` seguro (random)
- Encola outbox `CART_ABANDONED` solo si el customer tiene email
- Registra evento `CART_ABANDONED_NOTIFIED`
- Cada add/update de item en carrito actualiza `last_activity_at`

Recover endpoint/UI:
- `GET /api/store/cart/recover?token=...`
- UI: `/cart/recover?token=...` (redirige a `/checkout?cartId=...`)
- Token con validez configurable (`CART_RECOVERY_TOKEN_DAYS`, default 7)

### Recommendations
- `GET /api/store/recommendations?productId=...`
- Estrategia simple combinada:
  - misma categoria (prioridad)
  - top sellers ultimos 30 dias
- UI en detalle de producto: seccion **Te puede interesar**

### Bundles / Combos
- `GET /api/store/bundles/applicable?cartId=...`
- `POST /api/store/bundles/apply`
- Reglas implementadas:
  - bundle por `variant_id`
  - requiere que el carrito tenga todas las variantes y cantidades
  - calcula descuento estimado (`PERCENT` o `FIXED`)
  - al aplicar guarda `carts.applied_bundle_id` y evento `BUNDLE_APPLIED`
  - en checkout, si sigue aplicando, se suma al `discount_total` snapshot del order
  - registra evento `CART_BUNDLE_APPLIED` al convertir carrito->order

### Eventos (webstore.events)
Se registran eventos minimos:
- `CART_ABANDONED_NOTIFIED`
- `CART_RECOVERED`
- `BUNDLE_APPLIED`
- `CART_BUNDLE_APPLIED`

### Curl examples � Sprint 14
Job abandoned carts:

```bash
curl -X POST -b cookie.txt "http://localhost:3000/api/admin/jobs/abandoned-carts?inactiveHours=24&limit=50"
```

Recover cart (API):

```bash
curl "http://localhost:3000/api/store/cart/recover?token=REPLACE_TOKEN"
```

Recommendations:

```bash
curl "http://localhost:3000/api/store/recommendations?productId=1"
```

Bundles aplicables:

```bash
curl "http://localhost:3000/api/store/bundles/applicable?cartId=REPLACE_CART_UUID"
```

Aplicar bundle:

```bash
curl -X POST http://localhost:3000/api/store/bundles/apply \
  -H "Content-Type: application/json" \
  -d '{
    "cartId": "REPLACE_CART_UUID",
    "bundleId": "1"
  }'
```

## Supabase Migration (schema + data)

### Objetivo
Restaurar `schema + data` desde un dump SQL de PostgreSQL hacia un proyecto Supabase, preservando los schemas `inventory` y `webstore`.

### Variables de entorno (sin hardcodear secretos)
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_DB_NAME` (default: `postgres`)
- `SUPABASE_DB_USER` (default: `postgres`)
- `SUPABASE_REGION_HOST` (opcional; si el host real difiere del patron `db.<ref>.supabase.co`)

### Verificar `psql`
```bash
psql --version
```

Si no esta instalado:
- Windows: instala PostgreSQL client tools (o PostgreSQL) y agrega `psql` al `PATH`.
- macOS: `brew install libpq && brew link --force libpq`
- Ubuntu/Debian: `sudo apt-get install postgresql-client`

### Conexion Supabase (SSL requerido)
```bash
export PGSSLMODE=require
HOST="${SUPABASE_REGION_HOST:-db.${SUPABASE_PROJECT_REF}.supabase.co}"
USER="${SUPABASE_DB_USER:-postgres}"
DB="${SUPABASE_DB_NAME:-postgres}"
```

### DATABASE_URL para Vercel (produccion)
```env
DATABASE_URL="postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require"
```

Nota: el host directo de Supabase puede ser IPv6-only. Si tu red no soporta IPv6, usa el pooler/host alterno de Supabase (IPv4) y ajusta `SUPABASE_REGION_HOST` / `DATABASE_URL`.

### Prechecks antes del restore
```bash
psql "host=$HOST port=5432 dbname=$DB user=$USER password=$SUPABASE_DB_PASSWORD sslmode=require" -v ON_ERROR_STOP=1 -c "SELECT version();"
psql "host=$HOST port=5432 dbname=$DB user=$USER password=$SUPABASE_DB_PASSWORD sslmode=require" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
psql "host=$HOST port=5432 dbname=$DB user=$USER password=$SUPABASE_DB_PASSWORD sslmode=require" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS citext;" || true
```

### Restore del dump
```bash
psql "host=$HOST port=5432 dbname=$DB user=$USER password=$SUPABASE_DB_PASSWORD sslmode=require" \
  -v ON_ERROR_STOP=1 \
  -f "/mnt/data/dump-sales_inventory_db-202602241045.sql"
```

### Fallback: dump sanitizado
Si el dump falla por `CREATE DATABASE`, `ALTER DATABASE` o `\connect`, crea una copia sanitizada removiendo lineas con:
- `CREATE DATABASE`
- `\connect`
- `ALTER DATABASE`
- `REVOKE CONNECT`
- `OWNER TO`

Ejemplo (Linux/macOS):
```bash
grep -vE 'CREATE DATABASE|^\\connect|ALTER DATABASE|REVOKE CONNECT|OWNER TO' \
  /mnt/data/dump-sales_inventory_db-202602241045.sql \
  > /mnt/data/dump-sales_inventory_db-202602241045.sanitized.sql

psql "host=$HOST port=5432 dbname=$DB user=$USER password=$SUPABASE_DB_PASSWORD sslmode=require" \
  -v ON_ERROR_STOP=1 \
  -f "/mnt/data/dump-sales_inventory_db-202602241045.sanitized.sql"
```

### Verificacion post-restore
Schemas esperados:
```bash
psql "host=$HOST port=5432 dbname=$DB user=$USER password=$SUPABASE_DB_PASSWORD sslmode=require" -v ON_ERROR_STOP=1 -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('inventory','webstore') ORDER BY schema_name;"
```

Conteos minimos (`> 0`):
```bash
psql "host=$HOST port=5432 dbname=$DB user=$USER password=$SUPABASE_DB_PASSWORD sslmode=require" -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) FROM inventory.products;"
psql "host=$HOST port=5432 dbname=$DB user=$USER password=$SUPABASE_DB_PASSWORD sslmode=require" -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) FROM inventory.product_prices;"
psql "host=$HOST port=5432 dbname=$DB user=$USER password=$SUPABASE_DB_PASSWORD sslmode=require" -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) FROM webstore.orders;"
psql "host=$HOST port=5432 dbname=$DB user=$USER password=$SUPABASE_DB_PASSWORD sslmode=require" -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) FROM inventory.sales;"
```

### Prisma (despues del restore)
```bash
npm run prisma:generate
npm run prisma:validate
```

Si Prisma falla por permisos/search_path:
- verifica permisos del usuario sobre `inventory` y `webstore`
- revisa `search_path` del rol en Supabase
- ajusta `search_path` del rol de conexion (no destructivo) antes de tocar datasource/schema

### Checklist de verificacion (Vercel + Supabase)
- [ ] `DATABASE_URL` en Vercel usa `sslmode=require`
- [ ] `PUBLIC_BASE_URL` apunta al dominio real
- [ ] `/api/health` responde OK en produccion
- [ ] existen schemas `inventory` y `webstore`
- [ ] conteos principales > 0
- [ ] `npm run prisma:generate` y `npm run prisma:validate` pasan
### Nota: dumps custom-format (pg_restore)
Si `psql` responde `The input is a PostgreSQL custom-format dump`, el archivo **no es SQL plano**.
Usa `pg_restore` en su lugar:

```bash
pg_restore --verbose --no-owner --no-privileges --exit-on-error \
  --host="$HOST" --port=5432 --username="$USER" --dbname="$DB" \
  /path/al/dump.custom
```

#### Workaround (dump legacy con `inventory.citext`)
Algunos dumps pueden referenciar `inventory.citext` (en lugar de `public.citext`).
En Supabase puede requerirse crear un alias temporal antes del restore:

```sql
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE EXTENSION IF NOT EXISTS citext;
DROP DOMAIN IF EXISTS inventory.citext;
CREATE DOMAIN inventory.citext AS public.citext;
```

Si el restore parcial falla, recrea `inventory`/`webstore` y reintenta con `pg_restore`.
## Vercel Deploy + Supabase Pooler (IPv4)

### Recomendado: Supabase pooler (IPv4) para runtime
Si el host directo `db.<PROJECT_REF>.supabase.co` falla por IPv6 (DNS/route local o de CI), usa el pooler IPv4.

Ejemplo (pooler session mode, puerto 5432):

```env
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
```

Notas:
- `sslmode=require` obligatorio
- `pgbouncer=true` + `connection_limit=1` recomendado para Prisma con pooler
- Ajusta host/region según el proyecto Supabase

### Rotacion de password de DB (Supabase)
1. Supabase Dashboard -> `Project Settings` -> `Database`
2. `Reset password`
3. Actualiza variables de entorno:
   - local (`.env`, no commitear)
   - Vercel (Production/Preview)
4. Revalida con:
   - `npm run db:check`
   - `npm run prisma:generate`
   - `npm run prisma:validate`

### Workaround `inventory.citext` (dump legacy)
Si el dump usa `inventory.citext` y Supabase tiene `citext` en `public`, es valido usar este alias:

```sql
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE EXTENSION IF NOT EXISTS citext;
DROP DOMAIN IF EXISTS inventory.citext;
CREATE DOMAIN inventory.citext AS public.citext;
```

Esto es aceptable para restauracion. (Opcional, mas adelante: migrar columnas a `public.citext` y remover el domain alias con una migracion controlada.)

### Script de verificacion DB
Se agrego:

```bash
npm run db:check
```

Verifica:
- schemas `inventory`, `webstore`
- conteos de tablas principales
- nota operativa sobre `inventory.citext`

## Smoke Test Checklist (local apuntando a Supabase)

### Preparacion local
Usa `DATABASE_URL` con pooler + SSL + PgBouncer params:

```env
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
```

### Checks recomendados
1. Prisma
```bash
npm run prisma:generate
npm run prisma:validate
```

2. Levantar app local
```bash
npm run dev
```

3. Health
```bash
curl http://localhost:3000/api/health
```
Esperado: `{"status":"ok",...,"db":"ok"}`

4. Catalog (store)
```bash
curl "http://localhost:3000/api/store/catalog?limit=5&offset=0"
```
Esperado: respuesta `200` con `data[]` y `meta.total`.

5. Admin auth + endpoint protegido (si tienes password de app disponible)
```bash
curl -c cookie.txt -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=<admin-email>&password=<admin-password>"

curl -b cookie.txt "http://localhost:3000/api/admin/inventory/stock?limit=5&offset=0"
```

Nota: la password de DB de Supabase **no** sirve para login de app. Se requiere una credencial de Auth.js (ADMIN) configurada en `AUTH_USERS_JSON` o vars `AUTH_ADMIN_*`.

## Vercel Deploy Checklist (Supabase + Mercado Pago + Outbox)

### 1) Importar proyecto
- Vercel -> `Add New Project`
- Importar repositorio desde GitHub/GitLab/Bitbucket

### 2) Configurar env vars en Vercel
Minimas:
- `DATABASE_URL` (Supabase pooler recomendado si hay problemas IPv6)
- `AUTH_SECRET`
- `PUBLIC_BASE_URL` (dominio Vercel/custom)
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET` (recomendado)
- `EMAIL_PROVIDER` (`console` en staging, `resend` en prod)
- `RESEND_API_KEY` (si `resend`)
- `EMAIL_FROM`
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` (si Sentry habilitado)

### 3) Deploy y smoke test
Despues del deploy:
- `GET /api/health`
- `GET /api/store/catalog?limit=5&offset=0`
- flujo basico `/store` -> PDP -> checkout

### 4) Webhook Mercado Pago (produccion)
Asegura que `PUBLIC_BASE_URL` sea el dominio publico correcto.

Webhook endpoint:
- `${PUBLIC_BASE_URL}/api/store/payments/mercadopago/webhook`

Si el webhook falla o se retrasa:
- usar `POST /api/admin/orders/[orderNumber]/reconcile-payment` desde admin como fallback operativo.

### 5) Outbox email (produccion)
- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY` configurada
- `EMAIL_FROM` verificado

Procesar outbox (ADMIN):
```bash
curl -X POST -b cookie.txt "${PUBLIC_BASE_URL}/api/admin/jobs/process-outbox?limit=50"
```

Verificar respuesta (`processed/sent/failed`) y revisar `webstore.notification_outbox.last_error` si hay fallos.
## Admin Smoke Test (local)

### Configurar credenciales de app (Auth.js)
La password de Supabase **no** sirve para login de `/api/auth`.
Debes configurar usuarios de la app con `AUTH_USERS_JSON` o `AUTH_ADMIN_*`.

Opciones:
- `AUTH_USERS_JSON` (recomendado para pruebas rapidas)
- `AUTH_ADMIN_EMAIL` + `AUTH_ADMIN_PASSWORD_HASH`

### Generar bcrypt hash (helper)
Se agrego script:

```bash
npm run auth:hash -- "tu_password_admin"
```

Usar el hash resultante en `AUTH_USERS_JSON` o `AUTH_ADMIN_PASSWORD_HASH`.

### Ejemplo (AUTH_USERS_JSON)
```env
AUTH_SECRET="<LONG_RANDOM_SECRET>"
AUTH_USERS_JSON='[{"email":"admin@primegear.local","passwordHash":"$2b$10$...","role":"ADMIN","name":"Admin"}]'
```

### Smoke test admin (curl)
Login (guarda cookie de sesion):

```bash
curl -c cookie.txt -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@primegear.local&password=<ADMIN_PASSWORD>"
```

Endpoint protegido de inventario:

```bash
curl -b cookie.txt "http://localhost:3000/api/admin/inventory/stock?limit=5&offset=0"
```

Endpoint rapido de humo (RBAC + DB):

```bash
curl -b cookie.txt "http://localhost:3000/api/admin/smoke"
```

Esperado:
- `200` con `data.ok=true` si sesion/rbac/db estan correctos.

## Vercel env vars minimal set

Checklist minimo para primer deploy funcional:
- [ ] `DATABASE_URL` (runtime app/prisma; pooler recomendado; `sslmode=require&pgbouncer=true&connection_limit=1`)
- [ ] `DATABASE_URL_PSQL` (scripts `psql`/`db:check`; sin params Prisma, solo `sslmode=require`)
- [ ] `AUTH_SECRET`
- [ ] `PUBLIC_BASE_URL`
- [ ] `MERCADOPAGO_ACCESS_TOKEN`
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` (recomendado)
- [ ] `EMAIL_PROVIDER` (`console` en staging / `resend` en prod)
- [ ] `EMAIL_FROM`
- [ ] `RESEND_API_KEY` (si `EMAIL_PROVIDER=resend`)
- [ ] `LOG_LEVEL` (ej. `info`)

Ejemplo `DATABASE_URL` (pooler IPv4 recomendado):

```env
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
```

Ejemplo `DATABASE_URL_PSQL`:

```env
DATABASE_URL_PSQL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

`db:check` usa `DATABASE_URL_PSQL` si existe; si no, cae a `DATABASE_URL` y parsea host/user/db/password para `psql`.

### Password rotation (Supabase DB)
- Supabase -> `Project Settings` -> `Database` -> `Reset password`
- Actualiza inmediatamente:
  - entorno local (`.env`)
  - Vercel (Production/Preview)
  - cualquier CI/CD que use `DATABASE_URL`

## Build and Ops Notes

### Sitemap fallback (build-safe)
- `/sitemap.xml` intenta cargar productos desde DB.
- Si la DB no esta disponible durante build/runtime, responde sitemap minimo (`/`, `/store`, `/robots.txt`) y registra warning.
- Esto evita romper `next build` por conectividad temporal o host no resoluble.

### Prisma generate (Windows EPERM/EBUSY)
- `npm run prisma:generate` usa wrapper con hasta 3 reintentos (1s/2s/3s) cuando detecta lock de archivo.
- Si persiste el error:
  1. cierra procesos `next dev`, `vitest`, editores con watchers.
  2. reintenta `npm run prisma:generate`.

### E2E execution
- `npm run test:e2e` ahora ejecuta al menos un smoke publico por defecto (`tests/e2e/smoke-public.spec.ts`).
- Tests que requieren credenciales/admin se saltan si faltan env vars:
  - `RUN_E2E_UI=1`
  - `E2E_ADMIN_EMAIL`
  - `E2E_ADMIN_PASSWORD`
