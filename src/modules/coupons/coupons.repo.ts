import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function findCouponByCode(code: string, db: DbClient = prisma) {
  return db.coupon.findUnique({
    where: {
      code,
    },
  });
}

export async function listCoupons(db: DbClient = prisma) {
  return db.coupon.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });
}

export async function createCoupon(
  data: {
    code: string;
    type: string;
    value: Prisma.Decimal;
    currency: string;
    minSubtotal: Prisma.Decimal;
    startsAt?: Date | null;
    endsAt?: Date | null;
    maxRedemptions?: number | null;
    isActive?: boolean;
  },
  db: DbClient = prisma,
) {
  return db.coupon.create({
    data: {
      code: data.code,
      type: data.type,
      value: data.value,
      currency: data.currency,
      minSubtotal: data.minSubtotal,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      maxRedemptions: data.maxRedemptions,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updateCouponByCode(
  code: string,
  data: Prisma.CouponUpdateInput,
  db: DbClient = prisma,
) {
  return db.coupon.update({
    where: { code },
    data,
  });
}

export async function listCouponRedemptionsByCode(code: string, db: DbClient = prisma) {
  return db.couponRedemption.findMany({
    where: {
      coupon: {
        code,
      },
    },
    orderBy: {
      redeemedAt: "desc",
    },
    include: {
      coupon: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          discountTotal: true,
          customerId: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function findOpenCartWithItems(cartId: string, db: DbClient = prisma) {
  return db.cart.findFirst({
    where: {
      id: cartId,
      status: "OPEN",
    },
    select: {
      id: true,
      customerId: true,
      items: {
        select: {
          id: true,
          quantity: true,
          unitPriceSnapshot: true,
        },
      },
    },
  });
}

export async function lockCouponById(couponId: bigint, db: DbClient) {
  await db.$queryRaw`SELECT id FROM webstore.coupons WHERE id = ${couponId} FOR UPDATE`;
}

export async function findCouponRedemptionByOrderId(orderId: bigint, db: DbClient) {
  return db.couponRedemption.findUnique({
    where: {
      orderId,
    },
  });
}

export async function createCouponRedemption(
  data: {
    couponId: bigint;
    orderId: bigint;
    customerId?: number;
  },
  db: DbClient,
) {
  return db.couponRedemption.create({
    data: {
      couponId: data.couponId,
      orderId: data.orderId,
      customerId: data.customerId,
    },
  });
}

export async function incrementCouponRedeemedCount(couponId: bigint, db: DbClient) {
  return db.coupon.update({
    where: { id: couponId },
    data: {
      redeemedCount: {
        increment: 1,
      },
    },
  });
}

