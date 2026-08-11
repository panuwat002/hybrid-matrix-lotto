import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = "lotto_unlock";
const COOKIE_VALUE = "1";

export function isUnlocked(): boolean {
  return cookies().get(COOKIE_NAME)?.value === COOKIE_VALUE;
}

export function setUnlocked(): void {
  cookies().set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // no maxAge → session cookie
  });
}
