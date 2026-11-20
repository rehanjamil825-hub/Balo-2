import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Megaphone,
  Bell,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle2,
  Clock,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import {
  listAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  listAllNotices,
  createNotice,
  updateNotice,
  deleteNotice,
} from "@/lib/admin.functions";
import { useDialogBehaviour } from "@/lib/a11y";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Dashboard — BALO admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminDashboard,
});

type Announcement = { id: string; message: string; is_published: boolean; publish_at: string };
type Notice = {
  id: string;
  title: string;
  body: string;
  is_published: boolean;
  publish_at: string;
};

type Feedback = { kind: "ok" | "err"; text: string } | null;

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string) {
  return new Date(v).toISOString();
}

function StatusPill({ item }: { item: { is_published: boolean; publish_at: string } }) {
  const future = new Date(item.publish_at).getTime() > Date.now();
  if (!item.is_published)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        <EyeOff className="size-3" aria-hidden="true" /> Draft
      </span>
    );
  if (future)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
        <Clock className="size-3" aria-hidden="true" /> Scheduled
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="size-3" aria-hidden="true" /> Live
    </span>
  );
}

/** Success/failure banner. Errors stay until the next successful action. */
function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  const isError = feedback.kind === "err";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`mb-3 flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
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

/** Modal shell used by both editors: labelled, Escape-closable, focus-trapped. */
function EditorModal({
  title,
  onClose,
  busy,
  error,
  children,
}: {
  title: string;
  onClose: () => void;
  busy: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);
  useDialogBehaviour(true, ref, close);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={close}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-auto rounded-2xl border border-border bg-card p-6 outline-none"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold">{title}</h3>
          <button type="button" onClick={close} aria-label="Close editor" disabled={busy}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children}
        {error && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the scrolling announcements marquee and the Notice Board. Saves are confirmed by
          the server before anything is reported as saved.
        </p>
      </div>
      <AnnouncementsSection />
      <NoticesSection />
    </div>
  );
}

function AnnouncementsSection() {
  const listFn = useServerFn(listAllAnnouncements);
  const createFn = useServerFn(createAnnouncement);
  const updateFn = useServerFn(updateAnnouncement);
  const deleteFn = useServerFn(deleteAnnouncement);
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems((await listFn()) as Announcement[]);
    } catch (error) {
      setFeedback({
        kind: "err",
        text: `Could not load announcements: ${errorMessage(error, "the server did not respond.")}`,
      });
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (item: Announcement) => {
    if (!window.confirm("Delete this announcement?")) return;
    setDeletingId(item.id);
    try {
      await deleteFn({ data: { id: item.id } });
      await load();
      setFeedback({ kind: "ok", text: "Announcement deleted." });
    } catch (error) {
      setFeedback({
        kind: "err",
        text: `The announcement was not deleted: ${errorMessage(error, "the server rejected it.")}`,
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Megaphone className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-xl font-bold">Announcements (marquee)</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setFeedback(null);
            setShowNew(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="size-4" aria-hidden="true" /> New
        </button>
      </div>

      <FeedbackBanner feedback={feedback} />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No announcements yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <StatusPill item={a} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.publish_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm">{a.message}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  aria-label="Edit announcement"
                  onClick={() => {
                    setFeedback(null);
                    setEditing(a);
                  }}
                  className="rounded-md p-1.5 hover:bg-muted"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Delete announcement"
                  disabled={deletingId === a.id}
                  onClick={() => remove(a)}
                  className="rounded-md p-1.5 text-destructive hover:bg-muted disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(showNew || editing) && (
        <AnnouncementForm
          initial={editing}
          onClose={() => {
            setShowNew(false);
            setEditing(null);
          }}
          onSave={async (value) => {
            try {
              if (editing) await updateFn({ data: { id: editing.id, ...value } });
              else await createFn({ data: value });
              setShowNew(false);
              setEditing(null);
              await load();
              setFeedback({
                kind: "ok",
                text: editing ? "Announcement updated." : "Announcement created.",
              });
            } catch (error) {
              throw new Error(errorMessage(error, "The server did not save the announcement."));
            }
          }}
        />
      )}
    </section>
  );
}

function AnnouncementForm({
  initial,
  onClose,
  onSave,
}: {
  initial: Announcement | null;
  onClose: () => void;
  onSave: (v: { message: string; is_published: boolean; publish_at: string }) => Promise<void>;
}) {
  const [message, setMessage] = useState(initial?.message ?? "");
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);
  const [when, setWhen] = useState(
    initial ? toLocalInputValue(initial.publish_at) : toLocalInputValue(new Date().toISOString()),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <EditorModal
      title={initial ? "Edit announcement" : "New announcement"}
      onClose={onClose}
      busy={busy}
      error={error}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await onSave({
              message: message.trim(),
              is_published: isPublished,
              publish_at: fromLocalInput(when),
            });
          } catch (err) {
            setError(errorMessage(err, "Save failed. Nothing was changed."));
          } finally {
            setBusy(false);
          }
        }}
        className="space-y-4"
      >
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Message</span>
          <textarea
            required
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {message.length}/500 characters
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Publish at</span>
          <input
            type="datetime-local"
            required
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          Publish (uncheck to save as draft)
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Save className="size-4" aria-hidden="true" /> {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </EditorModal>
  );
}

function NoticesSection() {
  const listFn = useServerFn(listAllNotices);
  const createFn = useServerFn(createNotice);
  const updateFn = useServerFn(updateNotice);
  const deleteFn = useServerFn(deleteNotice);
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems((await listFn()) as Notice[]);
    } catch (error) {
      setFeedback({
        kind: "err",
        text: `Could not load notices: ${errorMessage(error, "the server did not respond.")}`,
      });
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (item: Notice) => {
    if (!window.confirm("Delete this notice?")) return;
    setDeletingId(item.id);
    try {
      await deleteFn({ data: { id: item.id } });
      await load();
      setFeedback({ kind: "ok", text: "Notice deleted." });
    } catch (error) {
      setFeedback({
        kind: "err",
        text: `The notice was not deleted: ${errorMessage(error, "the server rejected it.")}`,
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-xl font-bold">Notices (Notice Board)</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setFeedback(null);
            setShowNew(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="size-4" aria-hidden="true" /> New
        </button>
      </div>

      <FeedbackBanner feedback={feedback} />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notices yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <StatusPill item={n} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(n.publish_at).toLocaleString()}
                  </span>
                </div>
                <p className="font-semibold">{n.title}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  aria-label="Edit notice"
                  onClick={() => {
                    setFeedback(null);
                    setEditing(n);
                  }}
                  className="rounded-md p-1.5 hover:bg-muted"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Delete notice"
                  disabled={deletingId === n.id}
                  onClick={() => remove(n)}
                  className="rounded-md p-1.5 text-destructive hover:bg-muted disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(showNew || editing) && (
        <NoticeForm
          initial={editing}
          onClose={() => {
            setShowNew(false);
            setEditing(null);
          }}
          onSave={async (value) => {
            try {
              if (editing) await updateFn({ data: { id: editing.id, ...value } });
              else await createFn({ data: value });
              setShowNew(false);
              setEditing(null);
              await load();
              setFeedback({ kind: "ok", text: editing ? "Notice updated." : "Notice created." });
            } catch (error) {
              throw new Error(errorMessage(error, "The server did not save the notice."));
            }
          }}
        />
      )}
    </section>
  );
}

function NoticeForm({
  initial,
  onClose,
  onSave,
}: {
  initial: Notice | null;
  onClose: () => void;
  onSave: (v: {
    title: string;
    body: string;
    is_published: boolean;
    publish_at: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);
  const [when, setWhen] = useState(
    initial ? toLocalInputValue(initial.publish_at) : toLocalInputValue(new Date().toISOString()),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <EditorModal
      title={initial ? "Edit notice" : "New notice"}
      onClose={onClose}
      busy={busy}
      error={error}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await onSave({
              title: title.trim(),
              body: body.trim(),
              is_published: isPublished,
              publish_at: fromLocalInput(when),
            });
          } catch (err) {
            setError(errorMessage(err, "Save failed. Nothing was changed."));
          } finally {
            setBusy(false);
          }
        }}
        className="space-y-4"
      >
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Title</span>
          <input
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Body</span>
          <textarea
            required
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {body.length}/2000 characters
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Publish at</span>
          <input
            type="datetime-local"
            required
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          Publish (uncheck to save as draft)
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Save className="size-4" aria-hidden="true" /> {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </EditorModal>
  );
}
