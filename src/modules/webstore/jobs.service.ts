import crypto from "node:crypto";

import { Prisma } from "@prisma/client";

import { enqueueCartNotificationEventInTransaction } from "@/modules/notifications/outbox.service";
import {
  abandonOldOpenCarts,
  cancelPendingOrders,
  createWebstoreEvent,
  expireReservationsByIds,
  findExpiredActiveReservations,
  listAbandonedOpenCartsForRecovery,
  setCartRecoveryToken,
  withTransaction,
} from "@/modules/webstore/repo";

export type ExpireReservationsJobOutput = {
  expiredReservations: number;
  cancelledOrders: number;
  abandonedCarts: number;
};

export type AbandonedCartsRecoveryJobOutput = {
  processed: number;
  notified: number;
  skippedNoEmail: number;
};

export async function expireReservationsJob(): Promise<ExpireReservationsJobOutput> {
  return withTransaction(async (tx) => {
    const now = new Date();
    const abandonAfterDays = Number(process.env.ABANDON_CART_AFTER_DAYS ?? "30");
    const abandonBefore = new Date(now.getTime() - abandonAfterDays * 24 * 60 * 60 * 1000);
    const expiredCandidates = await findExpiredActiveReservations(now, tx);
    const abandoned = await abandonOldOpenCarts(abandonBefore, tx);

    if (expiredCandidates.length === 0) {
      return {
        expiredReservations: 0,
        cancelledOrders: 0,
        abandonedCarts: abandoned.count,
      };
    }

    const reservationIds = expiredCandidates.map((reservation) => reservation.id);
    const uniqueOrderIds = [...new Set(expiredCandidates.map((reservation) => reservation.orderId))];

    const expired = await expireReservationsByIds(reservationIds, tx);
    const cancelled = await cancelPendingOrders(uniqueOrderIds, tx);

    return {
      expiredReservations: expired.count,
      cancelledOrders: cancelled.count,
      abandonedCarts: abandoned.count,
    };
  });
}

export async function abandonedCartsRecoveryJob(params: {
  inactiveHours: number;
  limit: number;
}): Promise<AbandonedCartsRecoveryJobOutput> {
  return withTransaction(async (tx) => {
    const inactiveBefore = new Date(Date.now() - params.inactiveHours * 60 * 60 * 1000);
    const candidates = await listAbandonedOpenCartsForRecovery({
      inactiveBefore,
      limit: params.limit,
      db: tx,
    });

    let notified = 0;
    let skippedNoEmail = 0;

    for (const cart of candidates) {
      if (!cart.customer_email) {
        skippedNoEmail += 1;
        continue;
      }

      const token = crypto.randomBytes(32).toString("base64url");
      const updated = await setCartRecoveryToken(
        cart.cart_id,
        { recoveryToken: token, recoverySentAt: new Date() },
        tx,
      );
      const publicBaseUrl = (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
      const recoveryLink = `${publicBaseUrl}/cart/recover?token=${encodeURIComponent(token)}`;

      await enqueueCartNotificationEventInTransaction({
        tx,
        cartId: cart.cart_id,
        eventType: "CART_ABANDONED",
        toAddress: cart.customer_email,
        payload: {
          cartId: cart.cart_id,
          customerId: cart.customer_id,
          recovery_link: recoveryLink,
          recoveryTokenCreatedAt: updated.recoverySentAt?.toISOString() ?? null,
        },
      });

      await createWebstoreEvent(
        {
          eventName: "CART_ABANDONED_NOTIFIED",
          entityType: "CART",
          entityId: cart.cart_id,
          cartId: cart.cart_id,
          payload: {
            inactiveHours: params.inactiveHours,
            recoveryLink,
          } as Prisma.InputJsonValue,
        },
        tx,
      );
      notified += 1;
    }

    return {
      processed: candidates.length,
      notified,
      skippedNoEmail,
    };
  });
}
