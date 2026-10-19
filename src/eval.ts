// Quick accuracy check: runs examples/cases.json through the model and checks
// that the answer mentions at least one expected keyword. Add your own cases and
// write down where the model fails: that is your blog material.
//   npm run eval            (uses MODEL or qwen3.5:4b)
//   npm run eval -- llama3.2:3b
import { readFileSync } from "node:fs";
import { createRedactor } from "./redact.js";
import { diagnose } from "./diagnose.js";

type Case = { name: string; context: string; error: string; payload: string; expect: string[] };
const cases = JSON.parse(readFileSync(new URL("../examples/cases.json", import.meta.url), "utf8")) as Case[];
const model = process.argv[2] ?? process.env.MODEL ?? "qwen3.5:4b";

console.log(`Model: ${model}\n`);
let passed = 0;

for (const c of cases) {
  const r = createRedactor();
  const input = { payload: r.apply(c.payload), error: r.apply(c.error), context: c.context };
  const t0 = Date.now();
  try {
    const { diagnosis, attempts } = await diagnose(input, model);
    const text = JSON.stringify(diagnosis).toLowerCase();
    const hit = c.expect.filter((k) => text.includes(k.toLowerCase()));
    const ok = hit.length > 0;
    if (ok) passed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}  (${((Date.now() - t0) / 1000).toFixed(1)}s, attempts: ${attempts}, matched: ${hit.join(", ") || "none"})`);
    if (!ok) console.log(`      cause: ${diagnosis.likelyCause}`);
  } catch (e) {
    console.log(`ERROR ${c.name}: ${(e as Error).message}`);
  }
}
console.log(`\n${passed}/${cases.length} passed`);
