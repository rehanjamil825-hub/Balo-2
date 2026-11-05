import { cn } from "@/lib/utils";
import wordmark from "@/assets/balo-ai-wordmark.png";

/**
 * Official BALO AI lettering: the uploaded teal "balo" + orange "AI"
 * mark with the cream background removed.
 */
export function BaloAiWordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-5 sm:h-6",
    md: "h-7 sm:h-8",
    lg: "h-14 sm:h-[4.75rem]",
  };
  return (
    <img
      src={wordmark}
      alt="balo AI"
      className={cn("w-auto object-contain object-left", sizes[size], className)}
    />
  );
}
