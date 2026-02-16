import { CartStatus, OrderStatus, Prisma, StockReservationStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function findOpenCartById(cartId: string, db: DbClient = prisma) {
  return db.cart.findFirst({
    where: {
      id: cartId,
      status: CartStatus.OPEN,
    },
    select: {
      id: true,
      customerId: true,
      status: true,
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          currency: true,
        },
      },
    },
  });
}

export async function findOpenCartBySession(sessionId: string, db: DbClient = prisma) {
  return db.cart.findFirst({
    where: {
      sessionId,
      status: CartStatus.OPEN,
    },
    select: {
      id: true,
      sessionId: true,
      status: true,
    },
  });
}

export async function createOpenCart(sessionId?: string, db: DbClient = prisma) {
  return db.cart.create({
    data: {
      sessionId,
      status: CartStatus.OPEN,
    },
    select: {
      id: true,
    },
  });
}

export async function findProductById(productId: number, db: DbClient = prisma) {
  return db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      isActive: true,
    },
  });
}

export async function findDefaultValidPrice(productId: number, db: DbClient = prisma) {
  const today = new Date();

  return db.productPrice.findFirst({
    where: {
      productId,
      validFrom: { lte: today },
      OR: [{ validTo: null }, { validTo: { gte: today } }],
      priceList: {
        isDefault: true,
      },
    },
    orderBy: {
      validFrom: "desc",
    },
    select: {
      salePrice: true,
      currency: true,
    },
  });
}

export async function findDefaultValidPricesByProductIds(productIds: number[], db: DbClient) {
  const prices = await Promise.all(
    productIds.map(async (productId) => ({
      productId,
      price: await findDefaultValidPrice(productId, db),
    })),
  );

  return new Map(
    prices.filter((entry) => entry.price).map((entry) => [entry.productId, entry.price as NonNullable<typeof entry.price>]),
  );
}

export async function upsertCartItem(
  params: {
    cartId: string;
    productId: number;
    quantity: Prisma.Decimal;
    unitPriceSnapshot: Prisma.Decimal;
    currency: string;
  },
  db: DbClient = prisma,
) {
  return db.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId: params.cartId,
        productId: params.productId,
      },
    },
    update: {
      quantity: {
        increment: params.quantity,
      },
      unitPriceSnapshot: params.unitPriceSnapshot,
      currency: params.currency,
    },
    create: {
      cartId: params.cartId,
      productId: params.productId,
      quantity: params.quantity,
      unitPriceSnapshot: params.unitPriceSnapshot,
      currency: params.currency,
    },
    select: {
      cartId: true,
      productId: true,
      quantity: true,
      unitPriceSnapshot: true,
      currency: true,
    },
  });
}

export async function createOrder(
  data: {
    orderNumber: string;
    customerId?: number;
    branchId?: number;
    notes?: string;
  },
  db: DbClient,
) {
  return db.order.create({
    data: {
      orderNumber: data.orderNumber,
      customerId: data.customerId,
      branchId: data.branchId,
      notes: data.notes,
      status: OrderStatus.PENDING_PAYMENT,
      currency: "COP",
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      currency: true,
    },
  });
}

export async function createOrderItems(
  data: Array<{
    orderId: bigint;
    productId: number;
    quantity: Prisma.Decimal;
    unitPriceSnapshot: Prisma.Decimal;
    currency: string;
  }>,
  db: DbClient,
) {
  return db.orderItem.createMany({
    data: data.map((item) => ({
      orderId: item.orderId,
      productId: item.productId,
      quantity: item.quantity,
      unitPriceSnapshot: item.unitPriceSnapshot,
      discountAmount: new Prisma.Decimal(0),
      taxAmount: new Prisma.Decimal(0),
      currency: item.currency,
    })),
  });
}

export async function createStockReservations(
  data: Array<{
    orderId: bigint;
    branchId?: number;
    productId: number;
    quantity: Prisma.Decimal;
    expiresAt: Date;
  }>,
  db: DbClient,
) {
  return db.stockReservation.createMany({
    data: data.map((reservation) => ({
      orderId: reservation.orderId,
      branchId: reservation.branchId,
      productId: reservation.productId,
      quantity: reservation.quantity,
      status: StockReservationStatus.ACTIVE,
      expiresAt: reservation.expiresAt,
    })),
  });
}

export async function markCartAsCheckedOut(cartId: string, db: DbClient) {
  return db.cart.update({
    where: { id: cartId },
    data: { status: CartStatus.CHECKED_OUT },
  });
}

export async function findOrderByNumber(orderNumber: string, db: DbClient = prisma) {
  return db.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      stockReservations: true,
      shipments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });
}

export async function updateOrderStatus(
  orderId: bigint,
  status: OrderStatus,
  db: DbClient,
) {
  return db.order.update({
    where: { id: orderId },
    data: { status },
  });
}

export async function releaseActiveReservations(orderId: bigint, db: DbClient) {
  return db.stockReservation.updateMany({
    where: {
      orderId,
      status: StockReservationStatus.ACTIVE,
    },
    data: {
      status: StockReservationStatus.RELEASED,
    },
  });
}

export function withTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(callback);
}
