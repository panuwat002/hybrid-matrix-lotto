"use server";

import { setUnlocked } from "@/lib/session/unlock";

export async function confirmUnlock(): Promise<void> {
  setUnlocked();
}
