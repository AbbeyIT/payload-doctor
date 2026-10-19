export type Msg = { role: "system" | "user" | "assistant"; content: string };

const BASE = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

export async function listModels(): Promise<string[]> {
  const r = await fetch(`${BASE}/api/tags`, { signal: AbortSignal.timeout(3000) });
  if (!r.ok) throw new Error(`Ollama responded with ${r.status}`);
  const j = (await r.json()) as { models?: { name: string }[] };
  return (j.models ?? []).map((m) => m.name);
}

export async function chat(model: string, messages: Msg[]): Promise<string> {
  const r = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      format: "json",
      think: false,
      options: { temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!r.ok) throw new Error(`Ollama error ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { message?: { content?: string } };
  return j.message?.content ?? "";
}
