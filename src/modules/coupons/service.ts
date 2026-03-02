import { Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import type {
  ValidateCouponInputDto,
  ValidateCouponOutputDto,
} from "@/modules/coupons/dto";
import {
  createCoupon,
  createCouponRedemption,
  findCouponByCode,
  findCouponRedemptionByOrderId,
  findOpenCartWithItems,
  incrementCouponRedeemedCount,
  listCouponRedemptionsByCode,
  listCoupons,
  lockCouponById,
  updateCouponByCode,
} from "@/modules/coupons/repo";

function toDecimal(value: number | string | Prisma.Decimal) {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function calculateDiscountAmount(params: {
  subtotal: Prisma.Decimal;
  type: string;
  value: Prisma.Decimal;
}) {
  const { subtotal, type, value } = params;
  if (type === "PERCENT") {
    return subtotal.mul(value).div(100).toDecimalPlaces(2);
  }

  if (type === "FIXED") {
    return Prisma.Decimal.min(value, subtotal);
  }

  throw new AppError("BAD_REQUEST", 400, "Unsupported coupon type.");
}

function validateCouponWindowAndRules(params: {
  coupon: NonNullable<Awaited<ReturnType<typeof findCouponByCode>>>;
  now: Date;
  subtotal: Prisma.Decimal;
}) {
  const { coupon, now, subtotal } = params;
  if (!coupon.isActive) {
    return { valid: false, reason: "Coupon is inactive." } as const;
  }
  if (coupon.startsAt && coupon.startsAt > now) {
    return { valid: false, reason: "Coupon is not active yet." } as const;
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    return { valid: false, reason: "Coupon has expired." } as const;
  }
  if (subtotal.lessThan(coupon.minSubtotal)) {
    return { valid: false, reason: "Cart subtotal does not meet minimum." } as const;
  }
  if (
    typeof coupon.maxRedemptions === "number" &&
    coupon.redeemedCount >= coupon.maxRedemptions
  ) {
    return { valid: false, reason: "Coupon redemption limit reached." } as const;
  }
  return { valid: true } as const;
}

export async function validateCouponForCart(
  input: ValidateCouponInputDto,
): Promise<ValidateCouponOutputDto> {
  const cart = await findOpenCartWithItems(input.cartId);
  if (!cart) {
    throw new AppError("NOT_FOUND", 404, "Open cart not found.");
  }

  const subtotal = cart.items.reduce((acc, item) => {
    return acc.plus(item.unitPriceSnapshot.mul(item.quantity));
  }, new Prisma.Decimal(0));

  const coupon = await findCouponByCode(input.code.trim().toUpperCase());
  if (!coupon) {
    return {
      valid: false,
      discountAmount: "0.00",
      newTotal: subtotal.toFixed(2),
      reason: "Coupon not found.",
    };
  }

  const ruleCheck = validateCouponWindowAndRules({
    coupon,
    now: new Date(),
    subtotal,
  });
  if (!ruleCheck.valid) {
    return {
      valid: false,
      discountAmount: "0.00",
      newTotal: subtotal.toFixed(2),
      reason: ruleCheck.reason,
    };
  }

  const discount = calculateDiscountAmount({
    subtotal,
    type: coupon.type,
    value: coupon.value,
  });

  return {
    valid: true,
    discountAmount: discount.toFixed(2),
    newTotal: subtotal.minus(discount).toFixed(2),
  };
}

export async function evaluateCouponForOrderSubtotal(params: {
  couponCode?: string;
  subtotal: Prisma.Decimal;
}) {
  if (!params.couponCode) {
    return {
      discountTotal: new Prisma.Decimal(0),
      couponCode: undefined,
      couponId: undefined,
    };
  }

  const coupon = await findCouponByCode(params.couponCode.trim().toUpperCase());
  if (!coupon) {
    throw new AppError("UNPROCESSABLE", 422, "Coupon not found.");
  }

  const ruleCheck = validateCouponWindowAndRules({
    coupon,
    now: new Date(),
    subtotal: params.subtotal,
  });
  if (!ruleCheck.valid) {
    throw new AppError("UNPROCESSABLE", 422, ruleCheck.reason);
  }

  const discountTotal = calculateDiscountAmount({
    subtotal: params.subtotal,
    type: coupon.type,
    value: coupon.value,
  });

  return {
    discountTotal,
    couponCode: coupon.code,
    couponId: coupon.id,
  };
}

export async function redeemCouponForPaidOrderInTransaction(params: {
  tx: Prisma.TransactionClient;
  orderId: bigint;
  customerId?: number;
  couponCode?: string | null;
}) {
  if (!params.couponCode) {
    return null;
  }

  const coupon = await findCouponByCode(params.couponCode, params.tx);
  if (!coupon) {
    throw new AppError("NOT_FOUND", 404, "Coupon not found for redemption.");
  }

  await lockCouponById(coupon.id, params.tx);

  const existingRedemption = await findCouponRedemptionByOrderId(params.orderId, params.tx);
  if (existingRedemption) {
    return existingRedemption;
  }

  if (
    typeof coupon.maxRedemptions === "number" &&
    coupon.redeemedCount >= coupon.maxRedemptions
  ) {
    throw new AppError("CONFLICT", 409, "Coupon redemption limit reached.");
  }

  const redemption = await createCouponRedemption(
    {
      couponId: coupon.id,
      orderId: params.orderId,
      customerId: params.customerId,
    },
    params.tx,
  );

  await incrementCouponRedeemedCount(coupon.id, params.tx);
  return redemption;
}

export async function listAdminCoupons() {
  const rows = await listCoupons();
  return {
    items: rows.map((coupon) => ({
      id: coupon.id.toString(),
      code: coupon.code,
      type: coupon.type,
      value: coupon.value.toString(),
      currency: coupon.currency,
      minSubtotal: coupon.minSubtotal.toString(),
      startsAt: coupon.startsAt?.toISOString() ?? null,
      endsAt: coupon.endsAt?.toISOString() ?? null,
      maxRedemptions: coupon.maxRedemptions,
      redeemedCount: coupon.redeemedCount,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt.toISOString(),
    })),
  };
}

export async function createAdminCoupon(input: {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  currency?: "COP";
  minSubtotal?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  maxRedemptions?: number | null;
  isActive?: boolean;
}) {
  if (input.type === "PERCENT" && input.value > 100) {
    throw new AppError("UNPROCESSABLE", 422, "Percent coupon cannot exceed 100.");
  }

  const coupon = await createCoupon({
    code: input.code.trim().toUpperCase(),
    type: input.type,
    value: toDecimal(input.value),
    currency: input.currency ?? "COP",
    minSubtotal: toDecimal(input.minSubtotal ?? 0),
    startsAt:
      input.startsAt === undefined
        ? undefined
        : input.startsAt === null
          ? null
          : new Date(input.startsAt),
    endsAt:
      input.endsAt === undefined
        ? undefined
        : input.endsAt === null
          ? null
          : new Date(input.endsAt),
    maxRedemptions: input.maxRedemptions ?? undefined,
    isActive: input.isActive,
  });

  return { id: coupon.id.toString(), code: coupon.code };
}

export async function updateAdminCouponByCode(
  code: string,
  input: {
    type?: "PERCENT" | "FIXED";
    value?: number;
    currency?: "COP";
    minSubtotal?: number;
    startsAt?: string | null;
    endsAt?: string | null;
    maxRedemptions?: number | null;
    isActive?: boolean;
  },
) {
  if (input.type === "PERCENT" && typeof input.value === "number" && input.value > 100) {
    throw new AppError("UNPROCESSABLE", 422, "Percent coupon cannot exceed 100.");
  }

  const updated = await updateCouponByCode(code.trim().toUpperCase(), {
    type: input.type,
    value: typeof input.value === "number" ? toDecimal(input.value) : undefined,
    currency: input.currency,
    minSubtotal:
      typeof input.minSubtotal === "number" ? toDecimal(input.minSubtotal) : undefined,
    startsAt:
      input.startsAt === undefined
        ? undefined
        : input.startsAt === null
          ? null
          : new Date(input.startsAt),
    endsAt:
      input.endsAt === undefined
        ? undefined
        : input.endsAt === null
          ? null
          : new Date(input.endsAt),
    maxRedemptions:
      input.maxRedemptions === undefined ? undefined : input.maxRedemptions,
    isActive: input.isActive,
  });

  return { id: updated.id.toString(), code: updated.code, isActive: updated.isActive };
}

export async function getAdminCouponRedemptions(code: string) {
  const rows = await listCouponRedemptionsByCode(code.trim().toUpperCase());
  return {
    items: rows.map((row) => ({
      id: row.id.toString(),
      couponCode: row.coupon.code,
      orderId: row.orderId.toString(),
      orderNumber: row.order.orderNumber,
      orderStatus: row.order.status,
      orderTotal: row.order.total.toString(),
      orderDiscountTotal: row.order.discountTotal.toString(),
      customerId: row.customerId,
      redeemedAt: row.redeemedAt.toISOString(),
    })),
  };
}
