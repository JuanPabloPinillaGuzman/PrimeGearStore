export type CouponTypeDto = "PERCENT" | "FIXED";

export type ValidateCouponInputDto = {
  code: string;
  cartId: string;
};

export type ValidateCouponOutputDto = {
  valid: boolean;
  discountAmount: string;
  newTotal: string;
  reason?: string;
};

export type CouponValidationResult = {
  valid: boolean;
  discountAmount: string;
  reason?: string;
  couponId?: string;
  code?: string;
};

