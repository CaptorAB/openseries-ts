import { defineConfig } from "vitest/config";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "istanbul",
      reporter: ["text", "text-summary"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/index.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
      ],
      thresholds: {
        statements: 95,
        branches: 79,
        functions: 95,
        lines: 95,
      },
    },
  },
  resolve: {
    alias: {
      "openseries": resolve(__dirname, "./src/index.ts"),
    },
  },
});
