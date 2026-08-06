import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BALO AI mark — a lightweight, purely CSS/SVG badge used everywhere the AI
 * appears (floating launcher, chat bubbles, page header). It replaces the old
 * bitmap logo so the mark stays crisp and themeable at every size.
 */
export function BaloAiMark({
  className,
  glow = false,
}: {
  className?: string;
  glow?: boolean;
}) {
  return (
    <span className={cn("relative inline-grid place-items-center", className)}>
      {glow && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-primary/30 blur-md"
        />
      )}
      <span className="relative grid size-full place-items-center rounded-full bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground shadow-sm ring-1 ring-white/25">
        <Sparkles className="size-[55%]" strokeWidth={2.4} />
      </span>
    </span>
  );
}
