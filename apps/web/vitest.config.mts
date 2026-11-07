import { configDefaults, defineConfig } from "vitest/config";

// Cho kiểm thử dùng được đường dẫn "@/..." như trong tsconfig.json.
// Bỏ qua .next/: bản dựng standalone chép cả mã nguồn và kiểm thử vào đó.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { exclude: [...configDefaults.exclude, ".next/**"] },
});
