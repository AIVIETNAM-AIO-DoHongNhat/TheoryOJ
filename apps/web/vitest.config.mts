import { defineConfig } from "vitest/config";

// Cho kiểm thử dùng được đường dẫn "@/..." như trong tsconfig.json.
export default defineConfig({
  resolve: { tsconfigPaths: true },
});
