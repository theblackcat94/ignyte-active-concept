export const FREE_SHIPPING_THRESHOLD_CENTS = 10000;
export const RETURNS_LABEL = "EASY 30 DAY RETURNS";

export function qualifiesForFreeShipping(subtotalCents: number, discountCents = 0) {
  return subtotalCents - discountCents >= FREE_SHIPPING_THRESHOLD_CENTS;
}
