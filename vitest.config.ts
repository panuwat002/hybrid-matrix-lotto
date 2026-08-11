import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    // Stub server-only in tests — real enforcement is via Next.js build.
    server: { deps: { inline: ["server-only"] } },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./__tests__/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
});
