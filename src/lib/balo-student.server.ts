/**
 * BALO AI Student engine — talks directly to the Google Gemini API from the
 * server using the GEMINI_API_KEY secret. The key never reaches the browser.
 *
 * The preferred model and the fallback chain are read from the `ai_settings`
 * table so the school can change models from the admin dashboard without any
 * frontend change. If every Gemini model fails (rate limit / overload /
 * unavailable), the engine falls back to the Lovable AI gateway so students
 * still get an answer.
 */

import { generateText, type ModelMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Safe defaults if the backend settings row has no model configured. */
export const DEFAULT_STUDENT_MODEL = "gemini-3.6-flash";
export const DEFAULT_STUDENT_FALLBACKS = [
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash",
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

type GeminiAttempt = { model: string; status?: number; message: string };

async function callGemini(opts: {
  apiKey: string;
  model: string;
  system: string;
  contents: unknown;
}) {
  const res = await fetch(
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
        generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
      }),
    },
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
    .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();

  if (!text) {
    const reason = payload?.candidates?.[0]?.finishReason ?? payload?.promptFeedback?.blockReason;
    throw new Error(`Empty answer${reason ? ` (${reason})` : ""}`);
  }
  return text;
}

/** Statuses worth retrying on the next model in the chain. */
function shouldTryNextModel(status?: number) {
  return status === undefined || status === 404 || status === 429 || status === 400 || status >= 500;
}

export async function generateStudentAnswer(opts: {
  system: string;
  history: StudentTurn[];
  message: string;
  imageDataUrl: string | null;
  model?: string | null;
  fallbackModels?: string[] | null;
  geminiApiKey?: string;
  lovableApiKey?: string;
  runId?: string;
}): Promise<{ answer: string; model: string; attempts: GeminiAttempt[] }> {
  const attempts: GeminiAttempt[] = [];
  const chain = Array.from(
    new Set(
      [opts.model || DEFAULT_STUDENT_MODEL, ...(opts.fallbackModels ?? DEFAULT_STUDENT_FALLBACKS)]
        .map((m) => (m ?? "").trim())
        .filter(Boolean),
    ),
  );

  if (opts.geminiApiKey) {
    const contents = buildContents(opts.history, opts.message, opts.imageDataUrl);
    for (const model of chain) {
      try {
        const answer = await callGemini({
          apiKey: opts.geminiApiKey,
          model,
          system: opts.system,
          contents,
        });
        return { answer, model, attempts };
      } catch (error: any) {
        const status = error?.status as number | undefined;
        attempts.push({ model, status, message: String(error?.message ?? error).slice(0, 200) });
        if (!shouldTryNextModel(status)) break;
      }
    }
  }

  // Last resort: the Lovable AI gateway (also a Gemini-class model).
  if (opts.lovableApiKey) {
    const gateway = createLovableAiGatewayProvider(opts.lovableApiKey, opts.runId);
    const messages: ModelMessage[] = [
      ...opts.history.map((t) => ({ role: t.role, content: t.content }) as ModelMessage),
      {
        role: "user",
        content: opts.imageDataUrl
          ? ([
              { type: "text", text: opts.message || "Please read this image and help me with it." },
              { type: "image", image: opts.imageDataUrl },
            ] as any)
          : opts.message,
      },
    ];
    const result = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      system: opts.system,
      messages,
    });
    const answer = (result.text ?? "").trim();
    if (answer) return { answer, model: "gateway", attempts };
    attempts.push({ model: "gateway", message: "empty answer" });
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
