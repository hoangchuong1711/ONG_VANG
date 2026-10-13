import type { FareConfig, MemberDiscount } from "./admin-extras";

export function quoteDemoFare(
  fare: FareConfig,
  discounts: MemberDiscount[],
  tier: MemberDiscount["tier"],
  distanceKm: number,
  withSurcharge = true,
) {
  const baseFee = Math.round(fare.baseFee + Math.max(0, distanceKm - fare.includedKm) * fare.perKm);
  const surchargeFee = withSurcharge ? fare.surcharge : 0;
  const policy = discounts.find((item) => item.tier === tier);
  const vipDiscountFee = Math.min(policy?.maxDiscount ?? 0, Math.round((baseFee + surchargeFee) * (policy?.percent ?? 0) / 100));
  return { baseFee, surchargeFee, vipDiscountFee, totalFee: Math.max(0, baseFee + surchargeFee - vipDiscountFee) };
}
