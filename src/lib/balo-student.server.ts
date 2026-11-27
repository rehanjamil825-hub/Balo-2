/**
 * BALO AI Student engine — talks directly to the Google Gemini API from the
 * server using mode-specific API-key secrets. Keys never reach the browser.
 *
 * Fast path: race two Flash / Flash-Lite models and abort the loser. Thinking
 * Gemini 3 IDs are tried last so a slow admin model cannot stall the chat.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const PER_CALL_MS = 6_000;
const DEFAULT_BUDGET_MS = 9_000;
const DEFAULT_MAX_TOKENS = 1024;

/** Lite / 2.x Flash first — these answer in 1–3s with thinking off. */
export const DEFAULT_STUDENT_MODEL = "gemini-2.5-flash-lite";
export const DEFAULT_STUDENT_FALLBACKS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];
export type StudentTurn = { role: "user" | "assistant"; content: string };

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

function parseDataUrl(dataUrl: string) {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1]!, data: match[2]! };
}

function buildContents(history: StudentTurn[], message: string, imageDataUrl: string | null) {
  const contents = history.map((turn) => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [{ text: turn.content }] as GeminiPart[],
  }));

  const parts: GeminiPart[] = [
    { text: message || "Please read this image and help me with it." },
  ];
  if (imageDataUrl) {
    const img = parseDataUrl(imageDataUrl);
    if (img) parts.push({ inlineData: img });
  }
  contents.push({ role: "user", parts });
  return contents;
}

type GeminiAttempt = { model: string; keyIndex: number; status?: number; message: string };

function timeoutError(message = "Timed out waiting for the tutoring service.") {
  const err = new Error(message) as Error & { status?: number };
  err.status = 408;
  return err;
}

function speedRank(model: string) {
  const id = model.toLowerCase();
  if (id.includes("lite")) return 0;
  if (id.includes("2.0-flash")) return 1;
  if (id.includes("2.5-flash")) return 2;
  if (id.includes("flash-latest") || id.includes("flash-lite")) return 3;
  if (/gemini-3/.test(id)) return 9;
  return 5;
}

function preferFast(models: string[]) {
  return [...models].sort((a, b) => speedRank(a) - speedRank(b));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
  external?: AbortSignal,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const onAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", onAbort, { once: true });
  }
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === "AbortError" || error?.code === "ABORT_ERR") throw timeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", onAbort);
  }
}

async function callGemini(opts: {
  apiKey: string;
  model: string;
  system: string;
  contents: unknown;
  timeoutMs: number;
  disableThinking: boolean;
  maxOutputTokens: number;
  signal?: AbortSignal;
}) {
  const generationConfig: Record<string, unknown> = {
    temperature: 0.4,
    maxOutputTokens: opts.maxOutputTokens,
  };
  if (opts.disableThinking) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const res = await fetchWithTimeout(
    `${GEMINI_BASE}/${encodeURIComponent(opts.model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": opts.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: opts.contents,
        generationConfig,
      }),
    },
    opts.timeoutMs,
    opts.signal,
  );

  const raw = await res.text();
  if (!res.ok) {
    let msg = raw.slice(0, 300);
    try {
      msg = JSON.parse(raw)?.error?.message ?? msg;
    } catch {
      /* keep raw snippet */
    }
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  let payload: any = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("Malformed response from the tutoring service.");
  }

  const text: string = (payload?.candidates?.[0]?.content?.parts ?? [])
    .map((p: any) => {
      if (!p || p.thought === true) return "";
      return typeof p.text === "string" ? p.text : "";
    })
    .join("")
    .trim();

  if (!text) {
    const reason = payload?.candidates?.[0]?.finishReason ?? payload?.promptFeedback?.blockReason;
    throw new Error(`Empty answer${reason ? ` (${reason})` : ""}`);
  }
  return text;
}

async function callGeminiFast(opts: {
  apiKey: string;
  model: string;
  system: string;
  contents: unknown;
  timeoutMs: number;
  maxOutputTokens: number;
  signal?: AbortSignal;
}) {
  try {
    return await callGemini({ ...opts, disableThinking: true });
  } catch (error: any) {
    const message = String(error?.message ?? error);
    if (error?.status === 400 && /thinking/i.test(message)) {
      return await callGemini({ ...opts, disableThinking: false });
    }
    throw error;
  }
}

function shouldRetry(status?: number, message = "") {
  if (status === undefined || status === 404 || status === 408 || status === 429 || (status ?? 0) >= 500) {
    return true;
  }
  if (status === 400 && /not found|invalid|unknown model/i.test(message)) return true;
  return false;
}

function firstFulfilled<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let left = promises.length;
    let lastErr: unknown = new Error("No tutoring model is available.");
    if (!left) {
      reject(lastErr);
      return;
    }
    for (const promise of promises) {
      promise.then(resolve, (error) => {
        lastErr = error;
        left -= 1;
        if (left === 0) reject(lastErr);
      });
    }
  });
}

export async function generateStudentAnswer(opts: {
  system: string;
  history: StudentTurn[];
  message: string;
  imageDataUrl: string | null;
  model?: string | null;
  fallbackModels?: string[] | null;
  apiKeys: string[];
  budgetMs?: number;
  maxOutputTokens?: number;
}): Promise<{ answer: string; model: string; attempts: GeminiAttempt[] }> {
  const attempts: GeminiAttempt[] = [];
  const budgetMs = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  const maxOutputTokens = opts.maxOutputTokens ?? DEFAULT_MAX_TOKENS;
  const deadline = Date.now() + budgetMs;
  const chain = preferFast(
    Array.from(
      new Set(
        [
          opts.model,
          ...(opts.fallbackModels ?? []),
          DEFAULT_STUDENT_MODEL,
          ...DEFAULT_STUDENT_FALLBACKS,
        ]
          .map((m) => (m ?? "").trim())
          .filter(Boolean),
      ),
    ),
  ).slice(0, 4);

  const contents = buildContents(opts.history, opts.message, opts.imageDataUrl);
  const apiKey = opts.apiKeys.find((k) => k);
  if (!apiKey) {
    const err = new Error("No tutoring model is available.") as Error & { status?: number };
    err.status = 401;
    throw err;
  }

  const run = (model: string, timeoutMs: number, signal?: AbortSignal) =>
    callGeminiFast({
      apiKey,
      model,
      system: opts.system,
      contents,
      timeoutMs,
      maxOutputTokens,
      signal,
    });

  const remaining = () => deadline - Date.now();

  // Wave 1: race the two fastest IDs. First usable reply wins.
  const wave = chain.slice(0, Math.min(2, chain.length));
  const waveMs = Math.min(PER_CALL_MS, Math.max(remaining(), 0));
  if (wave.length && waveMs >= 1800) {
    const waveAbort = new AbortController();
    try {
      const winner = await firstFulfilled(
        wave.map(async (model) => {
          try {
            const answer = await run(model, waveMs, waveAbort.signal);
            return { answer, model };
          } catch (error: any) {
            attempts.push({
              model,
              keyIndex: 0,
              status: error?.status,
              message: String(error?.message ?? error).slice(0, 200),
            });
            throw error;
          }
        }),
      );
      waveAbort.abort();
      return { answer: winner.answer, model: winner.model, attempts };
    } catch {
      waveAbort.abort();
    }
  }

  // Wave 2: remaining models, one at a time, still inside the budget.
  for (const model of chain.slice(wave.length)) {
    const left = remaining();
    if (left < 1800) break;
    try {
      const answer = await run(model, Math.min(PER_CALL_MS, left));
      return { answer, model, attempts };
    } catch (error: any) {
      const status = error?.status as number | undefined;
      const message = String(error?.message ?? error).slice(0, 200);
      attempts.push({ model, keyIndex: 0, status, message });
      if (!shouldRetry(status, message)) break;
    }
  }

  const last = attempts[attempts.length - 1];
  const err = new Error(last?.message ?? "No tutoring model is available.") as Error & {
    status?: number;
    attempts?: GeminiAttempt[];
  };
  err.status = last?.status;
  err.attempts = attempts;
  throw err;
}
