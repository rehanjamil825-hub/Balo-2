import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  Save,
  Plus,
  Trash2,
  GraduationCap,
  MessagesSquare,
  Activity,
  AlertTriangle,
} from "lucide-react";
import {
  listAiSettings,
  updateAiSettings,
  listCurriculum,
  upsertCurriculumItem,
  deleteCurriculumItem,
  listAiActivity,
} from "@/lib/admin-ai.functions";

export const Route = createFileRoute("/admin/ai")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "BALO AI settings — BALO admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminAiPage,
});

type Setting = {
  id: string;
  mode: "assistant" | "student";
  is_enabled: boolean;
  system_instructions: string;
};
type Item = { id: string; name: string; sort_order: number; is_active: boolean };
type Feedback = { kind: "ok" | "err"; text: string } | null;

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

function AdminAiPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">BALO AI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Switch each AI mode on or off, tune how it behaves, and manage the classes the Student
          tutor supports.
        </p>
      </div>
      <ModesSection />
      <CurriculumSection />
      <ActivitySection />
    </div>
  );
}

function ModesSection() {
  const listFn = useServerFn(listAiSettings);
  const saveFn = useServerFn(updateAiSettings);
  const [rows, setRows] = useState<Setting[]>([]);
  const [draft, setDraft] = useState<Record<string, Setting>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const load = useCallback(async () => {
    try {
      const list = (await listFn()) as Setting[];
      setRows(list);
      setDraft(Object.fromEntries(list.map((s) => [s.id, s])));
    } catch (error) {
      setFeedback({
        kind: "err",
        text: `Could not load AI settings: ${message(error, "no response.")}`,
      });
    }
  }, [listFn]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (setting: Setting) => {
    setBusy(setting.id);
    setFeedback(null);
    try {
      const saved = (await saveFn({
        data: {
          id: setting.id,
          is_enabled: setting.is_enabled,
          system_instructions: setting.system_instructions,
        },
      })) as Setting | null;
      if (!saved) throw new Error("The server did not confirm the save.");
      setRows((current) => current.map((row) => (row.id === saved.id ? saved : row)));
      setDraft((current) => ({ ...current, [saved.id]: saved }));
      setFeedback({
        kind: "ok",
        text: `${setting.mode === "assistant" ? "Assistant" : "Student"} mode saved.`,
      });
    } catch (error) {
      setFeedback({
        kind: "err",
        text: `Not saved: ${message(error, "the server rejected the change.")}`,
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Sparkles className="size-4 text-primary" aria-hidden="true" /> Modes &amp; behaviour
      </h2>
      <Banner feedback={feedback} />
      <div className="grid gap-5 lg:grid-cols-2">
        {rows.map((row) => {
          const d = draft[row.id] ?? row;
          return (
            <div key={row.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  {row.mode === "assistant" ? (
                    <MessagesSquare className="size-4" aria-hidden="true" />
                  ) : (
                    <GraduationCap className="size-4" aria-hidden="true" />
                  )}
                  {row.mode === "assistant" ? "Assistant mode" : "Student mode"}
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={d.is_enabled}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, [row.id]: { ...d, is_enabled: e.target.checked } }))
                    }
                  />
                  {d.is_enabled ? "Enabled" : "Disabled"}
                </label>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.mode === "assistant"
                  ? "Answers about BALO using the knowledge base, notices and announcements."
                  : "ICSE tutor for students, using syllabi and academic documents."}
              </p>
              <label className="mt-3 block">
                <span className="sr-only">System instructions for {row.mode} mode</span>
                <textarea
                  value={d.system_instructions}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      [row.id]: { ...d, system_instructions: e.target.value },
                    }))
                  }
                  rows={10}
                  maxLength={8000}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed"
                />
              </label>
              <button
                type="button"
                onClick={() => save(d)}
                disabled={busy === row.id}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                <Save className="size-4" aria-hidden="true" />{" "}
                {busy === row.id ? "Saving…" : "Save"}
              </button>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Loading settings…</p>}
      </div>
    </section>
  );
}

function CurriculumSection() {
  const listFn = useServerFn(listCurriculum);
  const upsertFn = useServerFn(upsertCurriculumItem);
  const delFn = useServerFn(deleteCurriculumItem);
  const [classes, setClasses] = useState<Item[]>([]);
  const [newClass, setNewClass] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const load = useCallback(async () => {
    try {
      const result = await listFn();
      setClasses(result.classes as Item[]);
    } catch (error) {
      setFeedback({
        kind: "err",
        text: `Could not load classes: ${message(error, "no response.")}`,
      });
    }
  }, [listFn]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (name: string) => {
    if (!name.trim()) return;
    setAdding(true);
    setFeedback(null);
    try {
      await upsertFn({
        data: { kind: "class", name: name.trim(), sort_order: classes.length + 1, is_active: true },
      });
      setNewClass("");
      await load();
      setFeedback({ kind: "ok", text: "Class added." });
    } catch (error) {
      setFeedback({
        kind: "err",
        text: `Class not added: ${message(error, "the server rejected it.")}`,
      });
    } finally {
      setAdding(false);
    }
  };

  const toggle = async (item: Item) => {
    setBusyId(item.id);
    setFeedback(null);
    try {
      await upsertFn({
        data: {
          kind: "class",
          id: item.id,
          name: item.name,
          sort_order: item.sort_order,
          is_active: !item.is_active,
        },
      });
      await load();
      setFeedback({ kind: "ok", text: item.is_active ? "Class hidden." : "Class shown." });
    } catch (error) {
      setFeedback({
        kind: "err",
        text: `Not changed: ${message(error, "the server rejected it.")}`,
      });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this class from the student tutor?")) return;
    setBusyId(id);
    setFeedback(null);
    try {
      await delFn({ data: { kind: "class", id } });
      await load();
      setFeedback({ kind: "ok", text: "Class removed." });
    } catch (error) {
      setFeedback({
        kind: "err",
        text: `Class not removed: ${message(error, "the server rejected it.")}`,
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <GraduationCap className="size-4 text-primary" aria-hidden="true" /> Supported classes
      </h2>
      <Banner feedback={feedback} />
      <div className="max-w-xl rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold">Classes</h3>
        <div className="mt-3 flex gap-2">
          <label className="flex-1">
            <span className="sr-only">New class name</span>
            <input
              value={newClass}
              onChange={(e) => setNewClass(e.target.value)}
              placeholder="e.g. Class 9"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => add(newClass)}
            disabled={adding}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden="true" /> {adding ? "Adding…" : "Add"}
          </button>
        </div>
        <ul className="mt-3 divide-y divide-border">
          {classes.map((it) => (
            <li key={it.id} className="flex items-center justify-between py-2 text-sm">
              <span className={it.is_active ? "" : "text-muted-foreground line-through"}>
                {it.name}
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(it)}
                  disabled={busyId === it.id}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {it.is_active ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  disabled={busyId === it.id}
                  aria-label={`Remove ${it.name}`}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
        {classes.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">No classes yet.</p>
        )}
      </div>
    </section>
  );
}

type ActivityConversation = { id: string; mode: string | null; created_at: string };
type ActivityMessage = {
  id: string;
  mode: string | null;
  role: string | null;
  content: string | null;
  created_at: string;
};
type Activity = { conversations: ActivityConversation[]; recent: ActivityMessage[] };

function ActivitySection() {
  const listFn = useServerFn(listAiActivity);
  const [data, setData] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listFn()
      .then((result) => {
        if (alive) setData(result as Activity);
      })
      .catch((err) => {
        if (alive) setError(message(err, "Could not load usage statistics."));
      });
    return () => {
      alive = false;
    };
  }, [listFn]);

  const assistant = data?.conversations.filter((c) => c.mode === "assistant").length ?? 0;
  const student = data?.conversations.filter((c) => c.mode === "student").length ?? 0;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Activity className="size-4 text-primary" aria-hidden="true" /> Usage
      </h2>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-3xl font-bold">{assistant}</div>
          <div className="mt-1 text-xs text-muted-foreground">Assistant conversations</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-3xl font-bold">{student}</div>
          <div className="mt-1 text-xs text-muted-foreground">Student conversations</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-3xl font-bold">{data?.recent.length ?? 0}</div>
          <div className="mt-1 text-xs text-muted-foreground">Recent messages shown</div>
        </div>
      </div>
      <div className="max-h-96 divide-y divide-border overflow-y-auto rounded-2xl border border-border bg-card">
        {(data?.recent ?? []).map((m) => (
          <div key={m.id} className="px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>{m.mode}</span>·<span>{m.role}</span>·
              <span>{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-1 line-clamp-3 text-xs">{m.content}</p>
          </div>
        ))}
        {data && data.recent.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground">No AI conversations yet.</p>
        )}
      </div>
    </section>
  );
}
