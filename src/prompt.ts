import type { Msg } from "./ollama.js";

export type Input = { payload: string; error: string; context?: string };

export function detectFormat(p: string): "json" | "xml" | "text" {
  const t = p.trim();
  if (t.startsWith("<")) return "xml";
  if (t.startsWith("{") || t.startsWith("[")) return "json";
  return "text";
}

// Deterministic check done in code, not by the model. Small models are
// unreliable at spotting a missing comma, so we tell them.
export function parserHint(payload: string): string | null {
  if (detectFormat(payload) !== "json") return null;
  try {
    JSON.parse(payload);
    return "The payload is syntactically valid JSON.";
  } catch (e) {
    return `The payload is NOT valid JSON. Parser said: ${(e as Error).message}`;
  }
}

const SYSTEM = `You are Payload Doctor, an assistant for integration developers (APIs, middleware, webhooks, SAP, MuleSoft, iFlows).
You receive a payload that failed and the error it produced. Explain what is wrong and how to fix it.

Rules:
- Use only facts present in the input. Do not invent fields, endpoints, or error codes.
- Tokens like [EMAIL_1], [SECRET_2], [LONG_ID_1] are redacted values. They are NOT bugs.
- Be specific: name the exact field, element, path, or header involved.
- If the input does not contain enough information, say what is missing and set confidence to "low".
- suggestedFix may include a short corrected snippet.

Reply with ONLY a JSON object with these keys:
"summary": one or two sentences, plain language
"likelyCause": the most probable root cause
"suggestedFix": concrete steps or a corrected snippet
"checks": array of up to 4 short things to verify next
"confidence": "low", "medium", or "high"`;

export function buildMessages(i: Input): Msg[] {
  const fmt = detectFormat(i.payload);
  const hint = parserHint(i.payload);
  const parts = [
    i.context?.trim() ? `Context: ${i.context.trim()}` : null,
    `Payload format: ${fmt}`,
    hint,
    `Error message:\n${i.error.trim() || "(none provided)"}`,
    `Payload:\n${i.payload.trim()}`,
  ].filter(Boolean);
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: parts.join("\n\n") },
  ];
}
