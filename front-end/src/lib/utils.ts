/** @format */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatPrice(
  value: number | string | null | undefined,
  currency: string = "VND",
  locale: string = "vi-VN",
) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "đ0.00";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatPriceRange(
  min: number | string | null | undefined,
  max: number | string | null | undefined,
  currency: string = "VND",
  locale: string = "vi-VN",
) {
  return `${formatPrice(min, currency, locale)} - ${formatPrice(max, currency, locale)}`;
}
