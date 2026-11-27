/**
 * BALO AI Student engine — one Gemini Flash call, no thinking round-trips.
 *
 * Earlier “speed” passes tried Lite IDs and sent thinkingBudget: 0. Those
 * models 404 or reject the config, so every prompt became 2–4 serial API
 * calls and felt slower. This path uses gemini-2.0-flash (no thinking by
 * default) and only falls over on a fast 404.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const PER_CALL_MS = 8_000;
const DEFAULT_BUDGET_MS = 9_000;
const DEFAULT_MAX_TOKENS = 1024;

export const DEFAULT_STUDENT_MODEL = "gemini-2.0-flash";
export const DEFAULT_STUDENT_FALLBACKS = ["gemini-flash-latest", "gemini-2.5-flash"];
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

function isSlowModel(model: string) {
  return /gemini-3|thinking|1\.5/i.test(model);
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === "AbortError" || error?.code === "ABORT_ERR") throw timeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(opts: {
  apiKey: string;
  model: string;
  system: string;
  contents: unknown;
  timeoutMs: number;
  maxOutputTokens: number;
}) {
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
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: opts.maxOutputTokens,
        },
      }),
    },
    opts.timeoutMs,
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

function shouldRetry(status?: number, message = "") {
  if (status === 404 || status === 429 || (status ?? 0) >= 500) return true;
  if (status === 400 && /not found|invalid|unknown model/i.test(message)) return true;
  return false;
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

  const chain = Array.from(
    new Set(
      [opts.model, ...(opts.fallbackModels ?? []), DEFAULT_STUDENT_MODEL, ...DEFAULT_STUDENT_FALLBACKS]
        .map((m) => (m ?? "").trim())
        .filter((m) => m && !isSlowModel(m)),
    ),
  ).slice(0, 2);

  const contents = buildContents(opts.history, opts.message, opts.imageDataUrl);
  const apiKey = opts.apiKeys.find((k) => k);
  if (!apiKey) {
    const err = new Error("No tutoring model is available.") as Error & { status?: number };
    err.status = 401;
    throw err;
  }

  for (const model of chain) {
    const left = deadline - Date.now();
    if (left < 1500) break;
    try {
      const answer = await callGemini({
        apiKey,
        model,
        system: opts.system,
        contents,
        timeoutMs: Math.min(PER_CALL_MS, left),
        maxOutputTokens,
      });
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
