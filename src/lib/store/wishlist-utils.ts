export function mergeWishlistProductIds(localIds: number[], remoteIds: number[]) {
  return Array.from(
    new Set(
      [...remoteIds, ...localIds].filter((value): value is number => Number.isInteger(value) && value > 0),
    ),
  );
}

