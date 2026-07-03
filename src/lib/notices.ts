import { useEffect, useState } from "react";

// Update NOTICES to publish/remove notices. When you add a new entry with
// a new `id`, users who have opted in to notifications will see the browser
// notification and a red dot on the hamburger menu + Events button + Notice
// section until they open the Notice & Events page.

export type Notice = {
  id: string;
  title: string;
  body: string;
  date: string;
};

// Empty array = "no notices right now" and the Notice board renders an
// empty state message.
export const NOTICES: Notice[] = [];

const SEEN_KEY = "balo.notices.seen";
const NOTIFY_KEY = "balo.notices.notify";

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}
function writeSeen(ids: string[]) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch {}
}

/** Fires browser notifications for any notice ids the user hasn't seen yet.
 *  Only runs when the user opted in via checkbox. */
function maybeNotify() {
  if (typeof window === "undefined") return;
  const optedIn = localStorage.getItem(NOTIFY_KEY) === "1";
  if (!optedIn) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const seen = new Set(readSeen());
  for (const n of NOTICES) {
    if (!seen.has(n.id)) {
      try { new Notification(n.title, { body: n.body }); } catch {}
    }
  }
}

/** True when there's at least one notice the current user hasn't opened yet. */
export function useUnreadNotices() {
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    const seen = new Set(readSeen());
    setUnread(NOTICES.some((n) => !seen.has(n.id)));
    maybeNotify();
    const handler = () => {
      const s = new Set(readSeen());
      setUnread(NOTICES.some((n) => !s.has(n.id)));
    };
    window.addEventListener("balo:notices-seen", handler);
    return () => window.removeEventListener("balo:notices-seen", handler);
  }, []);
  return unread;
}

/** Called by the Notice page once the user has viewed the list. */
export function markAllNoticesSeen() {
  writeSeen(NOTICES.map((n) => n.id));
  window.dispatchEvent(new Event("balo:notices-seen"));
}

/** UI hook: whether the user has opted in to browser notifications for new notices. */
export function useNotifyPreference(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(localStorage.getItem(NOTIFY_KEY) === "1");
  }, []);
  const setValue = (v: boolean) => {
    localStorage.setItem(NOTIFY_KEY, v ? "1" : "0");
    setEnabled(v);
    if (v && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") Notification.requestPermission();
    }
  };
  return [enabled, setValue];
}
