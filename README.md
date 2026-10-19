# Payload Doctor

A local, private assistant for integration developers. Paste a failing JSON/XML payload and its error, and an open-weight model running on your own machine explains what went wrong and how to fix it.

- Runs on your laptop through [Ollama](https://ollama.com). No cloud API, no per-request cost, works offline.
- Emails, tokens, IPs, and long IDs are masked **in code** before the model sees anything. The UI shows exactly what was sent.
- The server binds to `127.0.0.1` only.

## Quick start

```bash
# 1. Install Ollama (https://ollama.com), then pull a model
ollama pull qwen3.5:4b      # or a smaller one: llama3.2:3b

# 2. Run the app
npm install
npm start                            # http://127.0.0.1:3000
```

Options (environment variables): `MODEL` (default `qwen3.5:4b`), `PORT` (default `3000`), `OLLAMA_HOST` (default `http://127.0.0.1:11434`).

## How it works

1. `src/redact.ts` masks secrets and personal data, using the same placeholder for the same value (`[EMAIL_1]`).
2. `src/prompt.ts` builds the prompt and adds a deterministic JSON parser check the model can rely on.
3. `src/ollama.ts` calls the local model in JSON mode.
4. `src/diagnose.ts` validates the reply with zod and retries once if the model returns something unusable.

## Test and evaluate

```bash
npm test                      # redaction tests (no model needed)
npm run eval                  # runs examples/cases.json through your model
npm run eval -- llama3.2:3b   # compare another model
```

Add your own cases to `examples/cases.json` (use fake data only).

## Limits

- Redaction is pattern-based. Review the "masked before sending" panel for anything it missed, such as names or account numbers.
- Small models can misread complex XML namespaces. Treat answers as a second opinion, not a verdict.

## License

[MIT](LICENSE)