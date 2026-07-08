import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value), min), max);
}

export function formatMeters(value) {
  return `${Number(value).toFixed(1)} m`;
}
