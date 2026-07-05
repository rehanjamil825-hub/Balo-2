import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PublicAnnouncement = {
  id: string;
  message: string;
  publish_at: string;
};

export type PublicNotice = {
  id: string;
  title: string;
  body: string;
  publish_at: string;
};

export function useLiveAnnouncements() {
  const [items, setItems] = useState<PublicAnnouncement[]>([]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("announcements")
        .select("id, message, publish_at")
        .eq("is_published", true)
        .lte("publish_at", nowIso)
        .order("publish_at", { ascending: false })
        .limit(20);
      if (!cancelled) setItems((data as PublicAnnouncement[] | null) ?? []);
    };
    load();
    const channel = supabase
      .channel("public:announcements")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);
  return items;
}

export function useLiveNotices() {
  const [items, setItems] = useState<PublicNotice[]>([]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("notices")
        .select("id, title, body, publish_at")
        .eq("is_published", true)
        .lte("publish_at", nowIso)
        .order("publish_at", { ascending: false })
        .limit(50);
      if (!cancelled) setItems((data as PublicNotice[] | null) ?? []);
    };
    load();
    const channel = supabase
      .channel("public:notices")
      .on("postgres_changes", { event: "*", schema: "public", table: "notices" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);
  return items;
}
