import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Calendar, MapPin, ArrowRight, Sparkles } from "lucide-react";

import sports from "@/assets/sports-day.jpg";
import summer from "@/assets/summer-camp.jpg";
import music from "@/assets/music.jpg.asset.json";
import funFiesta from "@/assets/fun-fiesta.jpg";
import rugby from "@/assets/rugby.jpg";
import staffAsset from "@/assets/staff-group.jpg.asset.json";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events & Stories — Balo English Medium School" },
      { name: "description", content: "Latest events, celebrations, and stories from Balo English Medium School in Howrah." },
      { property: "og:title", content: "Events & Stories — Balo English Medium School" },
      { property: "og:description", content: "Annual Sports Day, Summer Camp, Color Storm and more — see what's happening at Balo." },
      { property: "og:image", content: sports },
    ],
    links: [{ rel: "canonical", href: "/events" }],
  }),
  component: EventsPage,
});

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const posts = [
  {
    img: staffAsset.url,
    date: "March 2026",
    tag: "Celebration",
    title: "Color Storm 2026 — A festival of laughter and colour",
    excerpt: "Our annual Color Storm brought together every student, teacher, and parent for a day of music, dance, and joyful mess. A reminder that joy is the best curriculum.",
  },
  {
    img: sports,
    date: "January 2026",
    tag: "Sports",
    title: "Sports Day: 350 children, 1 spirit",
    excerpt: "From sack races to rugby finals, our Sports Day showcased the discipline, teamwork, and fearlessness our children carry into every classroom.",
  },
  {
    img: summer,
    date: "May 2025",
    tag: "Camp",
    title: "Summer Camp wraps up a record-breaking month",
    excerpt: "Two weeks of art, English conversation circles, science experiments and outdoor games — a summer the children will not forget.",
  },
  {
    img: music.url,
    date: "Ongoing",
    tag: "Music",
    title: "Harmonium classes find a second home",
    excerpt: "Our weekly music sessions are giving children a new language — one made of ragas, rhythm, and pure delight.",
  },
  {
    img: funFiesta,
    date: "December 2025",
    tag: "Fun Fiesta",
    title: "Fun Fiesta: a feast of food and friendship",
    excerpt: "Long tables, hundreds of plates, and a school that ate together as one big family — that's our Fun Fiesta in a sentence.",
  },
  {
    img: rugby,
    date: "Ongoing",
    tag: "Rugby",
    title: "Girls take the field: Balo's rugby revolution",
    excerpt: "Our rugby programme is teaching girls and boys alike that strength, courage, and grit belong to every child.",
  },
];

function EventsPage() {
  return (
    <main className="pt-24">
      <section className="py-20 px-6 gradient-hero text-white">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-1.5 text-xs font-semibold mb-6">
              <Sparkles className="size-3.5" /> News from Salkia
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-balance leading-[0.95]">
              Events & <span className="italic text-secondary">Stories.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/85 max-w-2xl">
              Every month at Balo English Medium School brings something to celebrate. Here are a few moments we love sharing.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((p, i) => (
            <motion.article
              key={p.title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group rounded-3xl overflow-hidden bg-card border border-border shadow-soft flex flex-col"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={p.img}
                  alt={p.title}
                  loading="lazy"
                  className="size-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent px-2.5 py-1 font-semibold">
                    {p.tag}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> {p.date}
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold leading-snug">{p.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed flex-1">{p.excerpt}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Read more <ArrowRight className="size-4" />
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="py-20 px-6 bg-card">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
          className="max-w-3xl mx-auto text-center"
        >
          <MapPin className="size-8 mx-auto text-accent mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold text-balance">Want to attend our next event?</h2>
          <p className="mt-4 text-muted-foreground">
            Visitors, well-wishers, and volunteers are always welcome at Balo. Drop us a line and we'll save you a chair.
          </p>
          <a
            href="mailto:baloindia2015@gmail.com"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-7 py-3.5 font-semibold shadow-soft hover:scale-105 transition-transform"
          >
            Email Us <ArrowRight className="size-4" />
          </a>
        </motion.div>
      </section>
    </main>
  );
}
