import { motion } from "framer-motion";
import { Megaphone } from "lucide-react";

/**
 * Marquee-style announcement banner shown below the main nav.
 * Content scrolls right-to-left continuously.
 */
export function AnnouncementBanner() {
  const messages = [
    "🎉 Admissions open for 2026-27 — visit us at 55 Pilkhana 2nd Bye Lane, Salkia",
    "📅 Sports Day 2026 arrives this December — save the date",
    "💛 Support a child today — ₹500 sends one student to school for a full month",
    "🎨 Color Storm 2026 art competition — winners on display now",
  ];
  const track = [...messages, ...messages];
  return (
    <div className="fixed top-[72px] inset-x-0 z-40 border-b border-border/50 bg-primary text-primary-foreground overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center gap-4 px-6 py-1.5">
        <div className="shrink-0 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]">
          <Megaphone className="size-3.5" /> Balo News
        </div>
        <div className="relative flex-1 overflow-hidden">
          <motion.div
            className="flex gap-12 whitespace-nowrap text-sm"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          >
            {track.map((m, i) => (
              <span key={i} className="shrink-0">{m}</span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
