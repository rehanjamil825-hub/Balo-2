import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles, X, Send, ImagePlus, GraduationCap, MessagesSquare, RotateCcw, Loader2,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getConversation, clearConversation } from "@/lib/ai.functions";

type Mode = "assistant" | "student";
type Msg = { role: "user" | "assistant"; content: string; image?: string | null };

const SESSION_KEY_STORAGE = "balo.ai.session";

function getSessionKey() {
  if (typeof window === "undefined") return "";
  let k = localStorage.getItem(SESSION_KEY_STORAGE);
  if (!k) {
    k = `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(SESSION_KEY_STORAGE, k);
  }
  return k;
}

const STARTERS: Record<Mode, string[]> = {
  assistant: [
    "What are the school timings?",
    "Tell me about BALO's history and founder",
    "What facilities does the school have?",
    "Any notices for parents right now?",
  ],
  student: [
    "Explain photosynthesis simply",
    "Solve: 2x + 5 = 17, step by step",
    "Help me revise the water cycle",
    "Give me 5 practice sums on fractions",
  ],
};

function Bubble({ m }: { m: Msg }) {
  const isUser = m.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}
      >
        {m.image && (
          <img
            src={m.image}
            alt="Uploaded question"
            className="mb-2 max-h-40 w-auto rounded-lg border border-border/40"
          />
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap">{m.content}</p>
        ) : (
          <div className="balo-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export function BaloAI() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("assistant");
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<Mode, Msg[]>>({ assistant: [], student: [] });
  const [loadedModes, setLoadedModes] = useState<Record<Mode, boolean>>({ assistant: false, student: false });
  const [enabled, setEnabled] = useState<Record<Mode, boolean>>({ assistant: true, student: true });
  const [classes, setClasses] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [classLabel, setClassLabel] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionKey = useMemo(() => getSessionKey(), []);
  const loadConv = useServerFn(getConversation);
  const clearConv = useServerFn(clearConversation);

  const current = msgs[mode];

  // Config: which modes are on + class/subject lists (public read policies)
  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: s }, { data: c }, { data: sub }] = await Promise.all([
        supabase.from("ai_settings").select("mode, is_enabled"),
        supabase.from("ai_classes").select("name").eq("is_active", true).order("sort_order"),
        supabase.from("ai_subjects").select("name").eq("is_active", true).order("sort_order"),
      ]);
      if (!alive) return;
      if (s) {
        const next = { assistant: true, student: true };
        for (const row of s) next[row.mode as Mode] = row.is_enabled;
        setEnabled(next);
      }
      setClasses((c ?? []).map((r) => r.name));
      setSubjects((sub ?? []).map((r) => r.name));
    })();
    return () => { alive = false; };
  }, []);

  // Restore the saved conversation for the active mode the first time it opens
  useEffect(() => {
    if (!open || loadedModes[mode] || !sessionKey) return;
    setLoadedModes((p) => ({ ...p, [mode]: true }));
    loadConv({ data: { sessionKey, mode } })
      .then((r) => {
        const restored = (r.messages as Msg[]).filter((m) => m.role === "user" || m.role === "assistant");
        if (restored.length) setMsgs((p) => ({ ...p, [mode]: restored }));
      })
      .catch(() => {});
  }, [open, mode, sessionKey, loadedModes, loadConv]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [current, busy, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, mode]);

  // Lock page scroll on small screens so the panel scrolls independently
  useEffect(() => {
    if (!open) return;
    if (window.innerWidth >= 640) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const pickImage = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) return setError("Image must be under 5 MB.");
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if ((!question && !image) || busy) return;
      setError(null);
      setBusy(true);
      const outgoing: Msg = { role: "user", content: question || "(image)", image };
      setMsgs((p) => ({ ...p, [mode]: [...p[mode], outgoing, { role: "assistant", content: "" }] }));
      setInput("");
      const sentImage = image;
      setImage(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            sessionKey,
            message: question,
            imageDataUrl: sentImage,
            classLabel: mode === "student" ? classLabel : null,
            subject: mode === "student" ? subject : null,
            topic: mode === "student" ? topic : null,
          }),
        });

        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => "");
          throw new Error(detail || "BALO AI could not answer that.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMsgs((p) => {
            const list = [...p[mode]];
            list[list.length - 1] = { role: "assistant", content: acc };
            return { ...p, [mode]: list };
          });
        }
        if (!acc.trim()) throw new Error("BALO AI returned an empty answer. Please try again.");
      } catch (e: any) {
        setError(e?.message ?? "Something went wrong.");
        setMsgs((p) => {
          const list = [...p[mode]];
          if (list.length && list[list.length - 1]!.role === "assistant" && !list[list.length - 1]!.content) {
            list.pop();
          }
          return { ...p, [mode]: list };
        });
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [busy, classLabel, image, mode, sessionKey, subject, topic],
  );

  const reset = async () => {
    setMsgs((p) => ({ ...p, [mode]: [] }));
    setError(null);
    try { await clearConv({ data: { sessionKey, mode } }); } catch {}
  };

  const modeOff = !enabled[mode];

  return (
    <>
      {/* Launcher */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.9, type: "spring", stiffness: 200, damping: 18 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open BALO AI"
        className="fixed bottom-5 right-5 z-[60] inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground pl-4 pr-5 py-3 shadow-lg hover:brightness-110 transition"
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
        <span className="text-sm font-semibold">BALO AI</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed z-[59] inset-x-3 bottom-20 sm:inset-x-auto sm:right-5 sm:w-[26rem] rounded-3xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[min(78vh,40rem)]"
          >
            {/* Header */}
            <div className="shrink-0 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 px-4 pt-3.5 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid place-items-center size-8 rounded-full bg-primary/15 text-primary">
                    <Sparkles className="size-4" />
                  </span>
                  <div className="leading-tight">
                    <div className="text-sm font-bold">BALO AI</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {mode === "assistant" ? "School assistant" : "Study tutor"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={reset} title="Clear this conversation" className="p-1.5 rounded-lg hover:bg-muted">
                    <RotateCcw className="size-4" />
                  </button>
                  <button onClick={() => setOpen(false)} title="Close" className="p-1.5 rounded-lg hover:bg-muted">
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-background/70 p-1">
                {(["assistant", "student"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "assistant" ? <MessagesSquare className="size-3.5" /> : <GraduationCap className="size-3.5" />}
                    {m === "assistant" ? "Assistant" : "Student"}
                  </button>
                ))}
              </div>

              {mode === "student" && (
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <select
                    value={classLabel}
                    onChange={(e) => setClassLabel(e.target.value)}
                    className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
                  >
                    <option value="">Class…</option>
                    {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
                  >
                    <option value="">Subject…</option>
                    {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Topic / chapter (optional)"
                    className="col-span-2 rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Messages — independent scroll */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
              {modeOff ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  This mode is currently switched off by the school.
                </p>
              ) : current.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {mode === "assistant"
                      ? "Ask me anything about BALO — history, staff, facilities, timings, notices and events."
                      : "I'm your ICSE study buddy. Pick your class and subject, ask a question, or upload a photo of a sum."}
                  </p>
                  <div className="grid gap-2">
                    {STARTERS[mode].map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left text-xs rounded-xl border border-border bg-background px-3 py-2 hover:bg-muted transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                current.map((m, i) => <Bubble key={i} m={m} />)
              )}

              {busy && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> BALO AI is thinking…
                </div>
              )}
              {error && (
                <div className="rounded-xl bg-destructive/10 text-destructive text-xs px-3 py-2">{error}</div>
              )}
            </div>

            {/* Composer */}
            {!modeOff && (
              <div className="shrink-0 border-t border-border bg-background/60 px-3 py-3">
                {image && (
                  <div className="mb-2 flex items-center gap-2">
                    <img src={image} alt="Attached" className="size-12 rounded-lg object-cover border border-border" />
                    <button onClick={() => setImage(null)} className="text-xs text-muted-foreground hover:text-destructive">
                      Remove
                    </button>
                  </div>
                )}
                <form
                  onSubmit={(e) => { e.preventDefault(); send(input); }}
                  className="flex items-end gap-2"
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { pickImage(e.target.files?.[0]); e.currentTarget.value = ""; }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    title="Upload an image of your question"
                    className="shrink-0 p-2 rounded-xl border border-border hover:bg-muted"
                  >
                    <ImagePlus className="size-4" />
                  </button>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                    }}
                    placeholder={mode === "assistant" ? "Ask about BALO…" : "Ask a study question…"}
                    className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm max-h-24"
                  />
                  <button
                    type="submit"
                    disabled={busy || (!input.trim() && !image)}
                    className="shrink-0 grid place-items-center size-9 rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    <Send className="size-4" />
                  </button>
                </form>
                <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
                  BALO AI answers from official school information. Verify important details with the office.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
