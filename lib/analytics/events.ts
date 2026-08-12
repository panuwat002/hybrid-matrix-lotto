import { track } from "@vercel/analytics";

type EventMap = {
  hero_enter: undefined;
  legal_back: undefined;
  legal_accept: undefined;
  matrix_generated: { targetDate: string };
  number_copied: {
    kind: "prize1" | "adjacent" | "front3" | "back3" | "back2";
  };
  support_qr_open: undefined;
  picker_scrollback: undefined;
};

export function trackEvent<K extends keyof EventMap>(
  name: K,
  ...args: EventMap[K] extends undefined ? [] : [props: EventMap[K]]
): void {
  const props = args[0] as Record<string, string> | undefined;
  track(name, props);
}
