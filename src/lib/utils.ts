import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toBengaliNumeral(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "";
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return val.toString().replace(/\d/g, (d) => bnDigits[parseInt(d, 10)]);
}

export function isPhoneClient(): boolean {
  if (typeof window === "undefined") return false;
  const ua = (navigator.userAgent || "").toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))|silk|kindle|playbook/i.test(ua)) {
    return false;
  }
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isMobileUA = /mobi|iphone|ipod|android.*mobile|blackberry/i.test(ua);
  return Boolean(hasTouch && isMobileUA);
}
