import { tool } from "ai";
import { z } from "zod";

import { QUANTITIES, solve, type Quantity } from "@/domain/ktct/formulas";

const KEYS = Object.keys(QUANTITIES) as [Quantity, ...Quantity[]];

const inputSchema = z.object({
  ...Object.fromEntries(
    KEYS.map((k) => [k, z.number().optional().describe(QUANTITIES[k])]),
  ) as Record<Quantity, z.ZodOptional<z.ZodNumber>>,
  can_tim: z.array(z.enum(KEYS)).describe("Các đại lượng đề bài yêu cầu tính"),
});

export const ktctCalculator = tool({
  description:
    "Tính các đại lượng của học thuyết giá trị thặng dư từ dữ kiện đề bài. Chỉ truyền những số đề bài cho, " +
    "tỷ suất ghi theo phần trăm (200 % thì truyền 200), cấu tạo hữu cơ 4/1 thì truyền cv_ratio = 4. " +
    "Trả về giá trị tính được, từng bước thay số, và đại lượng còn thiếu dữ kiện.",
  inputSchema,
  execute: async ({ can_tim, ...known }) => {
    const { values, steps, missing } = solve(known, can_tim);
    return {
      ket_qua: values,
      cac_buoc: steps.map((s) => `${s.formula}; với ${s.substitution} → ${s.value}`),
      thieu_du_kien: missing.map((q) => QUANTITIES[q]),
    };
  },
});
