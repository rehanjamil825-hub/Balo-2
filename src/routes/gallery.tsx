import { createFileRoute } from "@tanstack/react-router";
import { PageHero, Section, Reveal, TapHint, useLightbox } from "@/components/page-kit";

import g1 from "@/assets/drive-gallery2-01.jpg";
import g2 from "@/assets/drive-gallery2-02.jpg";
import g3 from "@/assets/drive-gallery2-03.jpg";
import g4 from "@/assets/drive-gallery2-04.jpg";
import g5 from "@/assets/drive-gallery2-05.jpg";
import g6 from "@/assets/drive-gallery2-06.jpg";
import g7 from "@/assets/drive-gallery2-07.jpg";
import g8 from "@/assets/drive-gallery2-08.jpg";
import g9 from "@/assets/drive-gallery2-09.jpg";
import g10 from "@/assets/drive-gallery2-10.jpg";
import g11 from "@/assets/drive-gallery2-11.jpg";
import g12 from "@/assets/drive-gallery2-12.jpg";
import g13 from "@/assets/drive3-01.jpg";
import g14 from "@/assets/drive3-02.jpg";
import g15 from "@/assets/drive3-03.jpg";
import g16 from "@/assets/drive3-04.jpg";
import g17 from "@/assets/drive3-05.jpg";
import g18 from "@/assets/drive3-06.jpg";
import dome1 from "@/assets/group-students.jpg";
import dome2 from "@/assets/raised-hands.jpg";
import dome3 from "@/assets/classroom-reading.jpg";
import gallerybackground from "@/assets/gallery-background.jpg";
import { absoluteUrl, canonicalLink } from "@/lib/school-facts";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Balo English Medium School, Howrah" },
      {
        name: "description",
        content:
          "Photographs from classrooms, celebrations, sports days and everyday life at Balo English Medium School in Salkia, Howrah.",
      },
      { property: "og:title", content: "Gallery — Balo English Medium School" },
      {
        property: "og:description",
        content: "A visual walk through our classrooms, celebrations and community moments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: absoluteUrl("/og-balo.jpg") },
    ],
    links: [canonicalLink("/gallery")],
  }),
  component: GalleryPage,
});

const dome = [
  { src: dome1, label: "Our students together" },
  { src: dome2, label: "Hands up in class" },
  { src: dome3, label: "Reading time" },
];

/**
 * Captions describe what is actually in each photograph. They are deliberately
 * factual (who or what is visible) instead of naming a person or an event the
 * photo may not show.
 */
const photos = [
  { src: g1, label: "A visitor with students and staff" },
  { src: g2, label: "Christmas celebration in the hall" },
  { src: g3, label: "Women's Day celebration" },
  { src: g4, label: "Students with sports certificates and a guest" },
  { src: g5, label: "Students and teachers together at school" },
  { src: g6, label: "Volunteers planning lessons at a laptop" },
  { src: g7, label: "Morning assembly in the hall" },
  { src: g8, label: "Friends together at school" },
  { src: g9, label: "Students with visiting volunteers" },
  { src: g10, label: "A health check-up at school" },
  { src: g11, label: "A school picnic by train" },
  { src: g12, label: "A lesson in progress" },
  { src: g13, label: "Students gathered in the hall" },
  { src: g14, label: "A class group photograph" },
  { src: g15, label: "A science exhibition" },
  { src: g16, label: "Smart class presentation" },
  { src: g17, label: "Computer lab session" },
  { src: g18, label: "Students with visitors" },
];

function GalleryPage() {
  const lightbox = useLightbox();

  return (
    <main>
      <PageHero
        eyebrow="Gallery"
        title="Life at BALO, in"
        highlight="pictures."
        lead="Every photograph here is a real day at Balo English Medium School — lessons, celebrations and the small moments that make this school a second home. Captions describe what each photo shows; please ask the school office before reposting pictures of children."
        image={gallerybackground}
      />

      {/* Gallery dome */}
      <Section>
        <div className="grid gap-4 md:grid-cols-3">
          {dome.map((p, i) => (
            <Reveal key={p.label} i={i}>
              <button
                onClick={() => lightbox.open(p.src, p.label)}
                className="group relative block w-full overflow-hidden rounded-[2rem] border border-border shadow-soft"
              >
                <TapHint />
                <img
                  src={p.src}
                  alt={p.label}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-[1.05] md:h-80"
                />
              </button>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section title="Photo gallery" eyebrow="Tap any photo to preview" muted>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <Reveal key={p.src} i={i % 4}>
              <button
                onClick={() => lightbox.open(p.src, p.label)}
                className="group block w-full overflow-hidden rounded-2xl border border-border bg-muted/40"
                aria-label={`Preview: ${p.label}`}
              >
                <img
                  src={p.src}
                  alt={p.label}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                />
              </button>
            </Reveal>
          ))}
        </div>
      </Section>

      {lightbox.node}
    </main>
  );
}
