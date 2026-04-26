"use client";

export const COOKIE_CONSENT_NAME = "analite_cookie_consent";

function encode(value: string): string {
  return encodeURIComponent(value);
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const hit = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));

  if (!hit) {
    return null;
  }

  return decode(hit.slice(name.length + 1));
}

export function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=${encode(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

export function hasCookieConsent(): boolean {
  return readCookie(COOKIE_CONSENT_NAME) === "accepted";
}

export function readJsonCookie<T>(name: string, fallback: T): T {
  const raw = readCookie(name);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJsonCookie(name: string, value: unknown, maxAgeSeconds = 60 * 60 * 24 * 30) {
  setCookie(name, JSON.stringify(value), maxAgeSeconds);
}
