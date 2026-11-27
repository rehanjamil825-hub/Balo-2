/**
 * BALO AI Student engine — talks directly to the Google Gemini API from the
 * server using mode-specific API-key secrets. Keys never reach the browser.
 *
 * The preferred model and the fallback chain are read from the `ai_settings`
 * table so the school can change models from the admin dashboard without any
 * frontend change. Models and keys are both retried for temporary failures.
 * Every Gemini call has a hard timeout so a thinking model cannot freeze chat.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const PER_CALL_MS = 12_000;
const DEFAULT_BUDGET_MS = 20_000;

/** Safe defaults if the backend settings row has no model configured. */
export const DEFAULT_STUDENT_MODEL = "gemini-2.5-flash";
export const DEFAULT_STUDENT_FALLBACKS = [
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash",
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
  disableThinking: boolean;
}) {
  const generationConfig: Record<string, unknown> = {
    temperature: 0.6,
    maxOutputTokens: opts.disableThinking ? 2048 : 4096,
  };
  if (opts.disableThinking) {
    // Gemini 3 Flash thinks by default; thinking tokens eat the output budget
    // and can stall the reply. Turn thinking off for a snappy school chat.
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
}) {
  try {
    return await callGemini({ ...opts, disableThinking: true });
  } catch (error: any) {
    const message = String(error?.message ?? error);
    // Older Flash IDs reject thinkingConfig — retry the same model without it.
    if (error?.status === 400 && /thinking/i.test(message)) {
      return await callGemini({ ...opts, disableThinking: false });
    }
    throw error;
  }
}

/** Statuses worth retrying on the next model in the chain. */
function shouldRetry(status?: number, message = "") {
  if (status === undefined || status === 404 || status === 408 || status === 429 || (status ?? 0) >= 500) {
    return true;
  }
  // Unknown / retired model names come back as 400 "is not found".
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
}): Promise<{ answer: string; model: string; attempts: GeminiAttempt[] }> {
  const attempts: GeminiAttempt[] = [];
  const budgetMs = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  const deadline = Date.now() + budgetMs;
  // Always append the built-in chain so a stale admin model (or empty
  // fallbacks row) cannot leave BALO AI with a single failing ID.
  const chain = Array.from(
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
  );

  const contents = buildContents(opts.history, opts.message, opts.imageDataUrl);
  for (let keyIndex = 0; keyIndex < opts.apiKeys.length; keyIndex += 1) {
    const apiKey = opts.apiKeys[keyIndex];
    if (!apiKey) continue;
    for (const model of chain) {
      const remaining = deadline - Date.now();
      if (remaining < 2500) break;
      try {
        const answer = await callGeminiFast({
          apiKey,
          model,
          system: opts.system,
          contents,
          timeoutMs: Math.min(PER_CALL_MS, remaining),
        });
        return { answer, model, attempts };
      } catch (error: any) {
        const status = error?.status as number | undefined;
        const message = String(error?.message ?? error).slice(0, 200);
        attempts.push({ model, keyIndex, status, message });
        if (!shouldRetry(status, message)) break;
      }
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
