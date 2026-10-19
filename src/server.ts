import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { listModels } from "./ollama.js";
import { createRedactor } from "./redact.js";
import { diagnose } from "./diagnose.js";

const DEFAULT_MODEL = process.env.MODEL ?? "qwen3.5:4b";
const PORT = Number(process.env.PORT ?? 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: "200kb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/models", async (_req, res) => {
  try {
    res.json({ models: await listModels(), default: DEFAULT_MODEL });
  } catch {
    res.status(503).json({ error: "Cannot reach Ollama. Start it with: ollama serve" });
  }
});

const Body = z.object({
  payload: z.string().min(1).max(100_000),
  error: z.string().max(20_000).default(""),
  context: z.string().max(500).default(""),
  model: z.string().default(DEFAULT_MODEL),
  redact: z.boolean().default(true),
});

app.post("/api/diagnose", async (req, res) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { payload, error, context, model, redact } = parsed.data;

  const redactor = createRedactor();
  const clean = redact
    ? { payload: redactor.apply(payload), error: redactor.apply(error), context: redactor.apply(context) }
    : { payload, error, context };

  const started = Date.now();
  try {
    const { diagnosis, attempts } = await diagnose(clean, model);
    res.json({
      diagnosis,
      model,
      attempts,
      ms: Date.now() - started,
      sentToModel: clean, // shown in the UI so the user can verify what the model saw
      redactions: redact ? redactor.counts() : {},
    });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : "Model call failed" });
  }
});

// Bind to localhost only: the tool is never reachable from other machines.
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Payload Doctor running at http://127.0.0.1:${PORT}  (model: ${DEFAULT_MODEL})`);
});
