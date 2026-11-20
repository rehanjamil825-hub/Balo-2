import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { TapHint } from "@/components/page-kit";

export function MediaCarousel({
  images,
  title,
  interval = 3200,
  aspect = "aspect-[4/3]",
  rounded = "",
  onOpen,
}: {
  images: string[];
  title: string;
  interval?: number;
  aspect?: string;
  rounded?: string;
  /** When provided, tapping the photo opens it in a lightbox preview. */
  onOpen?: (src: string, label: string) => void;
}) {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (images.length < 2 || reduceMotion) return;
    let plays = 0;
    const t = window.setInterval(() => {
      plays += 1;
      if (plays > 3) {
        window.clearInterval(t);
        return;
      }
      setActive((i) => (i + 1) % images.length);
    }, interval);
    return () => window.clearInterval(t);
  }, [images.length, interval, reduceMotion]);
  return (
    <div className={`relative w-full ${aspect} ${rounded} overflow-hidden`}>
      {images.map((src, i) => (
        <motion.img
          key={src + i}
          src={src}
          alt={i === active ? `${title} — photo ${i + 1}` : ""}
          aria-hidden={active !== i}
          loading="lazy"
          initial={false}
          animate={{ opacity: active === i ? 1 : 0, scale: active === i ? 1 : 1.04 }}
          transition={{ duration: 0.9 }}
          className="absolute inset-0 size-full object-cover"
        />
      ))}
      {onOpen && (
        <button
          type="button"
          onClick={() => {
            const src = images[active];
            if (src) onOpen(src, title);
          }}
          className="absolute inset-0 z-[5] cursor-zoom-in"
          aria-label={`Preview ${title}`}
        />
      )}
      {onOpen && <TapHint className="bottom-8" />}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              aria-label={`Show ${title} image ${i + 1}`}
              onClick={(e) => {
                e.stopPropagation();
                setActive(i);
              }}
              className={`h-1.5 rounded-full transition-all ${active === i ? "w-6 bg-white" : "w-1.5 bg-white/60"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
