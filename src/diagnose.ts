import { chat, type Msg } from "./ollama.js";
import { buildMessages, type Input } from "./prompt.js";
import { DiagnosisSchema, type Diagnosis } from "./schema.js";

export async function diagnose(
  input: Input,
  model: string,
  maxAttempts = 2,
): Promise<{ diagnosis: Diagnosis; attempts: number }> {
  const messages: Msg[] = buildMessages(input);
  let lastErr = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = await chat(model, messages);
    try {
      return { diagnosis: DiagnosisSchema.parse(JSON.parse(raw)), attempts: attempt };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      messages.push({ role: "assistant", content: raw });
      messages.push({
        role: "user",
        content: `That reply was not usable (${lastErr.slice(0, 300)}). Reply again with ONLY the JSON object containing all required keys.`,
      });
    }
  }
  throw new Error(`Model did not return valid JSON after ${maxAttempts} attempts: ${lastErr}`);
}
