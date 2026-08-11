import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = "lotto_unlock";
const COOKIE_VALUE = "1";
const MAX_AGE_SECONDS = 60 * 60 * 4; // 4 hours

export function isUnlocked(): boolean {
  return cookies().get(COOKIE_NAME)?.value === COOKIE_VALUE;
}

export function setUnlocked(): void {
  cookies().set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
  });
}
