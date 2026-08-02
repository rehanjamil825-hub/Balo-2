import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "@tanstack/react-router";
import {
  X, Send, ImagePlus, GraduationCap, MessagesSquare, RotateCcw, Loader2, Maximize2,
} from "lucide-react";
import baloAiLogo from "@/assets/balo-ai-logo.png";
import { useBaloChat, STARTERS, type Mode, type Msg } from "@/lib/use-balo-chat";
import { useState } from "react";

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
  const chat = useBaloChat(open);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.busy, open]);

  useEffect(() => {
    if (open) chat.inputRef.current?.focus();
  }, [open, chat.mode, chat.inputRef]);

  useEffect(() => {
    if (!open) return;
    if (window.innerWidth >= 640) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const canUpload = chat.mode === "student";

  return (
    <>
      {/* Launcher */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.9, type: "spring", stiffness: 200, damping: 18 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open BALO AI"
        className="fixed bottom-5 right-5 z-[60] inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground pl-2 pr-5 py-2 shadow-lg hover:brightness-110 transition"
      >
        {open ? (
          <span className="grid place-items-center size-8 rounded-full bg-primary-foreground/15">
            <X className="size-4" />
          </span>
        ) : (
          <img src={baloAiLogo} alt="" width={32} height={32} className="size-8 rounded-full bg-white/90 p-0.5" />
        )}
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
                  <img src={baloAiLogo} alt="BALO AI" width={32} height={32} className="size-8" />
                  <div className="leading-tight">
                    <div className="text-sm font-bold">BALO AI</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {chat.mode === "assistant" ? "School assistant" : "Study tutor"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link to="/balo-ai" title="Open full page" className="p-1.5 rounded-lg hover:bg-muted">
                    <Maximize2 className="size-4" />
                  </Link>
                  <button onClick={chat.reset} title="Clear this conversation" className="p-1.5 rounded-lg hover:bg-muted">
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
                    onClick={() => chat.setMode(m)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      chat.mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "assistant" ? <MessagesSquare className="size-3.5" /> : <GraduationCap className="size-3.5" />}
                    {m === "assistant" ? "Assistant" : "Student"}
                  </button>
                ))}
              </div>

              {chat.mode === "student" && (
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <select
                    value={chat.classLabel}
                    onChange={(e) => chat.setClassLabel(e.target.value)}
                    className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
                  >
                    <option value="">Class…</option>
                    {chat.classes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    value={chat.subject}
                    onChange={(e) => chat.setSubject(e.target.value)}
                    className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
                  >
                    <option value="">Subject…</option>
                    {chat.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input
                    value={chat.topic}
                    onChange={(e) => chat.setTopic(e.target.value)}
                    placeholder="Topic / chapter (optional)"
                    className="col-span-2 rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Messages — independent scroll */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
              {chat.modeOff ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  This mode is currently switched off by the school.
                </p>
              ) : chat.messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {chat.mode === "assistant"
                      ? "Ask me anything about BALO — history, staff, facilities, timings, notices and events."
                      : "I'm your ICSE study buddy. Pick your class and subject, ask a question, or upload a photo of a sum."}
                  </p>
                  <div className="grid gap-2">
                    {STARTERS[chat.mode].map((s) => (
                      <button
                        key={s}
                        onClick={() => chat.send(s)}
                        className="text-left text-xs rounded-xl border border-border bg-background px-3 py-2 hover:bg-muted transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chat.messages.map((m, i) => <Bubble key={i} m={m} />)
              )}

              {chat.busy && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> BALO AI is thinking…
                </div>
              )}
              {chat.error && (
                <div className="rounded-xl bg-destructive/10 text-destructive text-xs px-3 py-2">{chat.error}</div>
              )}
            </div>

            {/* Composer */}
            {!chat.modeOff && (
              <div className="shrink-0 border-t border-border bg-background/60 px-3 py-3">
                {chat.image && canUpload && (
                  <div className="mb-2 flex items-center gap-2">
                    <img src={chat.image} alt="Attached" className="size-12 rounded-lg object-cover border border-border" />
                    <button onClick={() => chat.setImage(null)} className="text-xs text-muted-foreground hover:text-destructive">
                      Remove
                    </button>
                  </div>
                )}
                <form
                  onSubmit={(e) => { e.preventDefault(); chat.send(chat.input); }}
                  className="flex items-end gap-2"
                >
                  {canUpload && (
                    <>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { chat.pickImage(e.target.files?.[0]); e.currentTarget.value = ""; }}
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        title="Upload an image of your question"
                        className="shrink-0 p-2 rounded-xl border border-border hover:bg-muted"
                      >
                        <ImagePlus className="size-4" />
                      </button>
                    </>
                  )}
                  <textarea
                    ref={chat.inputRef}
                    rows={1}
                    value={chat.input}
                    onChange={(e) => chat.setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); chat.send(chat.input); }
                    }}
                    placeholder={chat.mode === "assistant" ? "Ask about BALO…" : "Ask a study question…"}
                    className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm max-h-24"
                  />
                  <button
                    type="submit"
                    disabled={chat.busy || (!chat.input.trim() && !(chat.image && canUpload))}
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
