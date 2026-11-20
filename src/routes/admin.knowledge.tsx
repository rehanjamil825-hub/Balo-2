import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { BookOpen, FileText, Plus, Trash2, Save, X, AlertTriangle } from "lucide-react";
import {
  listKnowledge,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
  listDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/admin-ai.functions";

export const Route = createFileRoute("/admin/knowledge")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Knowledge base — BALO admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: KnowledgePage,
});

type Mode = "assistant" | "student";
type Know = {
  id: string;
  mode: Mode;
  category: string;
  title: string;
  content: string;
  is_active: boolean;
};
type Doc = {
  id: string;
  mode: Mode;
  title: string;
  doc_type: string;
  extracted_text: string | null;
  is_active: boolean;
};
type KnowDraft = Omit<Know, "id"> & { id?: string };
type DocDraft = {
  id?: string;
  mode: Mode;
  title: string;
  doc_type: string;
  extracted_text: string;
  is_active: boolean;
};
type Feedback = { kind: "ok" | "err"; text: string } | null;

const emptyKnow = {
  mode: "assistant" as Mode,
  category: "general",
  title: "",
  content: "",
  is_active: true,
};
const emptyDoc: DocDraft = {
  mode: "assistant",
  title: "",
  doc_type: "document",
  extracted_text: "",
  is_active: true,
};

function message(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function Banner({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  const isError = feedback.kind === "err";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
        isError
          ? "bg-destructive/10 text-destructive"
          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      }`}
    >
      {isError && <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <span>{feedback.text}</span>
    </div>
  );
}

function KnowledgePage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Knowledge base</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything BALO AI is allowed to say. The Assistant answers only from Assistant entries;
          the Student tutor only from Student entries and syllabi.
        </p>
      </div>
      <KnowledgeSection />
      <DocumentsSection />
    </div>
  );
}

function ModeBadge({ mode }: { mode: Mode }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${
        mode === "assistant" ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent-foreground"
      }`}
    >
      {mode}
    </span>
  );
}

function SaveButtons({
  busy,
  onCancel,
  label = "Save",
}: {
  busy: boolean;
  onCancel: () => void;
  label?: string;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        <Save className="size-4" aria-hidden="true" /> {busy ? "Saving…" : label}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50"
      >
        <X className="size-4" aria-hidden="true" /> Cancel
      </button>
    </div>
  );
}

function KnowledgeSection() {
  const listFn = useServerFn(listKnowledge);
  const createFn = useServerFn(createKnowledge);
  const updateFn = useServerFn(updateKnowledge);
  const delFn = useServerFn(deleteKnowledge);
  const [items, setItems] = useState<Know[]>([]);
  const [editing, setEditing] = useState<Know | null>(null);
  const [creating, setCreating] = useState<typeof emptyKnow | null>(null);
  const [filter, setFilter] = useState<"all" | Mode>("all");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems((await listFn()) as Know[]);
    } catch (error) {
      setFeedback({
        kind: "err",
        text: `Could not load entries: ${message(error, "no response.")}`,
      });
    }
  }, [listFn]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = items.filter((i) => filter === "all" || i.mode === filter);

  const remove = async (id: string) => {
    if (!window.confirm("Delete this knowledge entry?")) return;
    setDeletingId(id);
    setFeedback(null);
    try {
      await delFn({ data: { id } });
      await load();
      setFeedback({ kind: "ok", text: "Entry deleted." });
    } catch (error) {
      setFeedback({
        kind: "err",
        text: `Entry not deleted: ${message(error, "the server rejected it.")}`,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const form = (
    value: KnowDraft,
    setValue: (v: KnowDraft) => void,
    onSave: () => Promise<void>,
    onCancel: () => void,
    error: string | null,
  ) => (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave();
      }}
      className="space-y-3 rounded-2xl border border-primary/40 bg-card p-5"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          <span className="sr-only">Mode</span>
          <select
            value={value.mode}
            onChange={(e) => setValue({ ...value, mode: e.target.value as Mode })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="assistant">Assistant (about BALO)</option>
            <option value="student">Student (academic)</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Category</span>
          <input
            value={value.category}
            onChange={(e) => setValue({ ...value, category: e.target.value })}
            placeholder="Category"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.is_active}
            onChange={(e) => setValue({ ...value, is_active: e.target.checked })}
          />{" "}
          Active
        </label>
      </div>
      <label className="block">
        <span className="sr-only">Title</span>
        <input
          value={value.title}
          onChange={(e) => setValue({ ...value, title: e.target.value })}
          placeholder="Title"
          required
          maxLength={200}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="sr-only">Content</span>
        <textarea
          value={value.content}
          onChange={(e) => setValue({ ...value, content: e.target.value })}
          rows={6}
          required
          maxLength={20000}
          placeholder="Verified information BALO AI may use…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <SaveButtons busy={busy} onCancel={onCancel} />
    </form>
  );

  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <BookOpen className="size-4 text-primary" aria-hidden="true" /> Entries ({shown.length})
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            aria-label="Filter entries by mode"
            onChange={(e) => setFilter(e.target.value as "all" | Mode)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">All modes</option>
            <option value="assistant">Assistant</option>
            <option value="student">Student</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setCreating({ ...emptyKnow });
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          >
            <Plus className="size-4" aria-hidden="true" /> New entry
          </button>
        </div>
      </div>

      <Banner feedback={feedback} />

      {creating &&
        form(
          creating,
          setCreating,
          async () => {
            setBusy(true);
            setCreateError(null);
            try {
              await createFn({ data: creating });
              setCreating(null);
              await load();
              setFeedback({ kind: "ok", text: "Entry created." });
            } catch (error) {
              setCreateError(message(error, "Entry not created. Nothing was saved."));
            } finally {
              setBusy(false);
            }
          },
          () => setCreating(null),
          createError,
        )}

      <div className="space-y-3">
        {shown.map((it) =>
          editing?.id === it.id ? (
            <div key={it.id}>
              {form(
                editing,
                (value) => setEditing(value as Know),
                async () => {
                  if (!editing) return;
                  const { id, mode, category, title, content, is_active } = editing;
                  setBusy(true);
                  setEditError(null);
                  try {
                    await updateFn({ data: { id, mode, category, title, content, is_active } });
                    setEditing(null);
                    await load();
                    setFeedback({ kind: "ok", text: "Entry updated." });
                  } catch (error) {
                    setEditError(message(error, "Entry not updated. Nothing was saved."));
                  } finally {
                    setBusy(false);
                  }
                },
                () => setEditing(null),
                editError,
              )}
            </div>
          ) : (
            <div key={it.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <ModeBadge mode={it.mode} />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {it.category}
                    </span>
                    {!it.is_active && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm font-semibold">{it.title}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{it.content}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditError(null);
                      setEditing(it);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(it.id)}
                    disabled={deletingId === it.id}
                    aria-label={`Delete ${it.title}`}
                    className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ),
        )}
        {shown.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
      </div>
    </section>
  );
}

function DocumentsSection() {
  const listFn = useServerFn(listDocuments);
  const createFn = useServerFn(createDocument);
  const updateFn = useServerFn(updateDocument);
  const delFn = useServerFn(deleteDocument);
  const [items, setItems] = useState<Doc[]>([]);
  const [draft, setDraft] = useState<DocDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems((await listFn()) as Doc[]);
    } catch (error) {
      setFeedback({
        kind: "err",
        text: `Could not load documents: ${message(error, "no response.")}`,
      });
    }
  }, [listFn]);

  useEffect(() => {
    load();
  }, [load]);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSaveError("Please use a text file under 2 MB.");
      return;
    }
    const text = await file.text();
    setDraft((p) => ({
      ...(p ?? emptyDoc),
      title: p?.title || file.name.replace(/\.[^.]+$/, ""),
      extracted_text: text.slice(0, 200000),
    }));
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this document?")) return;
    setDeletingId(id);
    setFeedback(null);
    try {
      await delFn({ data: { id } });
      await load();
      setFeedback({ kind: "ok", text: "Document deleted." });
    } catch (error) {
      setFeedback({
        kind: "err",
        text: `Document not deleted: ${message(error, "the server rejected it.")}`,
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <FileText className="size-4 text-primary" aria-hidden="true" /> Documents &amp; syllabi (
          {items.length})
        </h2>
        <button
          type="button"
          onClick={() => {
            setSaveError(null);
            setDraft({ ...emptyDoc });
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          <Plus className="size-4" aria-hidden="true" /> Add document
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste the text of a syllabus, rule book or circular, or upload a .txt / .md / .csv file.
        BALO AI reads this text directly, so anything you add here becomes an official source.
      </p>

      <Banner feedback={feedback} />

      {draft && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setSaveError(null);
            try {
              const payload = {
                mode: draft.mode,
                title: draft.title,
                doc_type: draft.doc_type,
                extracted_text: draft.extracted_text,
                is_active: draft.is_active,
              };
              if (draft.id) await updateFn({ data: { ...payload, id: draft.id } });
              else await createFn({ data: payload });
              setDraft(null);
              await load();
              setFeedback({ kind: "ok", text: draft.id ? "Document updated." : "Document saved." });
            } catch (error) {
              setSaveError(message(error, "Document not saved. Nothing was changed."));
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-3 rounded-2xl border border-primary/40 bg-card p-5"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              value={draft.mode}
              aria-label="Mode"
              onChange={(e) => setDraft({ ...draft, mode: e.target.value as Mode })}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="assistant">Assistant (about BALO)</option>
              <option value="student">Student (syllabus / academic)</option>
            </select>
            <input
              value={draft.doc_type}
              onChange={(e) => setDraft({ ...draft, doc_type: e.target.value })}
              placeholder="Type e.g. syllabus"
              aria-label="Document type"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
              />{" "}
              Active
            </label>
          </div>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Document title"
            aria-label="Document title"
            required
            maxLength={200}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <label className="block text-xs">
            <span className="text-muted-foreground">Upload a text file (optional)</span>
            <input
              type="file"
              accept=".txt,.md,.csv,text/plain"
              onChange={(e) => readFile(e.target.files?.[0] ?? undefined)}
              className="mt-1 block"
            />
          </label>
          <textarea
            value={draft.extracted_text}
            onChange={(e) => setDraft({ ...draft, extracted_text: e.target.value })}
            rows={8}
            aria-label="Document text"
            placeholder="Document text…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
          />
          {saveError && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {saveError}
            </p>
          )}
          <SaveButtons busy={busy} onCancel={() => setDraft(null)} />
        </form>
      )}

      <div className="space-y-3">
        {items.map((d) => (
          <div
            key={d.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ModeBadge mode={d.mode} />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {d.doc_type}
                </span>
                {!d.is_active && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    Hidden
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm font-semibold">{d.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {(d.extracted_text ?? "").length.toLocaleString()} characters of text
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSaveError(null);
                  setDraft({ ...d, extracted_text: d.extracted_text ?? "" });
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => remove(d.id)}
                disabled={deletingId === d.id}
                aria-label={`Delete ${d.title}`}
                className="text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No documents yet.</p>}
      </div>
    </section>
  );
}
