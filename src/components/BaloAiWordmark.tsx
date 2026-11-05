import { cn } from "@/lib/utils";

/**
 * BALO AI wordmark: lowercase teal "balo" + orange "AI", matching the
 * official lettering (Quicksand, rounded geometric sans).
 */
export function BaloAiWordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-[1.05rem] leading-none",
    md: "text-[1.35rem] leading-none sm:text-[1.5rem]",
    lg: "text-5xl leading-none sm:text-6xl",
  };
  return (
    <span
      className={cn("balo-ai-wordmark inline-flex items-baseline", sizes[size], className)}
      aria-label="balo AI"
    >
      <span className="balo-ai-wordmark-name">balo</span>
      <span className="balo-ai-wordmark-ai">AI</span>
    </span>
  );
}
