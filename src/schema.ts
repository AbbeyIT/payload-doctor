import { z } from "zod";

// Small models sometimes return a string where an array is expected.
const stringList = z.preprocess(
  (v) => (typeof v === "string" ? [v] : v),
  z.array(z.string()).default([]),
);

export const DiagnosisSchema = z.object({
  summary: z.string().min(1),
  likelyCause: z.string().min(1),
  suggestedFix: z.string().min(1),
  checks: stringList,
  confidence: z.enum(["low", "medium", "high"]).catch("low"),
});

export type Diagnosis = z.infer<typeof DiagnosisSchema>;
