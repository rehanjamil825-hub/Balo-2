import { createFileRoute } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  BookOpen, Heart, Users, Star, MapPin, Phone, Mail, ArrowRight,
  Sparkles, HandHeart, Quote,
} from "lucide-react";

import hero from "@/assets/hero-classroom.jpg";
import reading from "@/assets/classroom-reading.jpg";
import teacher from "@/assets/teacher-board.jpg";
import group from "@/assets/group-students.jpg";
import portrait from "@/assets/student-portrait.jpg";
import playground from "@/assets/playground.jpg";
import hands from "@/assets/raised-hands.jpg";
import books from "@/assets/books.jpg";
import classroom1Asset from "@/assets/classroom-1.jpg.asset.json";
import classroom2Asset from "@/assets/classroom-2.jpg.asset.json";
import bannerAsset from "@/assets/balo-banner.png.asset.json";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { LazyImage } from "@/components/LazyImage";

const classroom1 = classroom1Asset.url;
const classroom2 = classroom2Asset.url;
const banner = bannerAsset.url;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Balo English Medium School — Free Education for Every Child in Howrah" },
      { name: "description", content: "Balo English Medium School is a community NGO in Salkia, Howrah delivering free English-medium education to underprivileged children since inception. Join us." },
      { property: "og:title", content: "Balo English Medium School — Educating Howrah's Brightest Futures" },
      { property: "og:description", content: "A 4.4★ rated community school in Salkia, Howrah giving children free, quality English-medium learning." },
      { property: "og:image", content: hero },
      { property: "og:url", content: "/" },
      { name: "twitter:image", content: hero },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "School",
        name: "Balo English Medium School",
        address: { "@type": "PostalAddress", streetAddress: "55 Pilkhana 2nd Bye Lane", addressLocality: "Howrah Salkia", addressRegion: "West Bengal", postalCode: "711101", addressCountry: "IN" },
        aggregateRating: { "@type": "AggregateRating", ratingValue: "4.4", reviewCount: "15" },
      }),
    }],
  }),
  component: Index,
});

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const } }),
};


function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  return (
    <section ref={ref} id="top" className="relative min-h-screen flex items-center overflow-hidden pt-24">
      <motion.div style={{ y, scale }} className="absolute inset-0 -z-10">
        <img src={hero} alt="Children at Balo English Medium School" className="size-full object-cover" width={1600} height={1024} />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/60 to-accent/70" />
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center w-full">
        <div className="lg:col-span-7 text-white">
          <motion.div initial="hidden" animate="show" variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-1.5 text-xs font-semibold tracking-wide mb-6">
            <Sparkles className="size-3.5" /> Salkia, Howrah · Est. community NGO
          </motion.div>
          <motion.h1 initial="hidden" animate="show" variants={fadeUp} custom={1} className="text-balance text-5xl md:text-7xl font-black leading-[0.95]">
            Every child deserves <span className="italic text-secondary">a chance to dream.</span>
          </motion.h1>
          <motion.p initial="hidden" animate="show" variants={fadeUp} custom={2} className="mt-6 text-lg md:text-xl text-white/85 max-w-xl">
            Balo English Medium School is a community-run NGO delivering free, quality English-medium education to the children of Babudanga, Pilkhana — one classroom, one bright future at a time.
          </motion.p>
          <motion.div initial="hidden" animate="show" variants={fadeUp} custom={3} className="mt-9 flex flex-wrap gap-4">
            <a href="#donate" className="group inline-flex items-center gap-2 rounded-full bg-white text-primary px-7 py-3.5 font-semibold shadow-soft hover:bg-secondary hover:text-secondary-foreground transition-all">
              Support a Child <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#about" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-7 py-3.5 font-semibold hover:bg-white/10 transition-colors">
              Our Story
            </a>
          </motion.div>
          <motion.div initial="hidden" animate="show" variants={fadeUp} custom={4} className="mt-10 flex items-center gap-6">
            <div className="flex">
              {[0,1,2,3,4].map(i => <Star key={i} className="size-5 fill-secondary text-secondary" />)}
            </div>
            <div className="text-sm text-white/80"><span className="font-bold text-white">4.4</span> · 15 Google reviews</div>
          </motion.div>
        </div>

        <div className="lg:col-span-5 relative hidden lg:block">
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.3 }}
            className="relative">
            <div className="grid grid-cols-2 gap-4">
              <motion.img animate={{ y: [0, -12, 0] }} transition={{ duration: 6, repeat: Infinity }}
                src={portrait} alt="" width={900} height={1100} loading="lazy"
                className="rounded-3xl shadow-card aspect-[3/4] object-cover" />
              <div className="space-y-4 pt-12">
                <motion.img animate={{ y: [0, 12, 0] }} transition={{ duration: 7, repeat: Infinity }}
                  src={reading} alt="" width={1200} height={900} loading="lazy"
                  className="rounded-3xl shadow-card aspect-square object-cover" />
                <motion.img animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity }}
                  src={books} alt="" width={1200} height={900} loading="lazy"
                  className="rounded-3xl shadow-card aspect-square object-cover" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 text-xs tracking-widest uppercase">
        Scroll
      </motion.div>
    </section>
  );
}

function Stats() {
  const stats = [
    { to: 480, suffix: "+", l: "Children Educated" },
    { to: 20, suffix: "+", l: "Dedicated Staff" },
    { to: 100, suffix: "%", l: "Free of Cost" },
    { to: 15, suffix: "+", l: "Years of Service" },
  ];
  return (
    <section className="py-20 gradient-warm">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s, i) => (
          <motion.div
            key={s.l}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i}
            whileHover={{ scale: 1.05 }}
            className="text-center cursor-default"
          >
            <div className="font-display text-5xl md:text-6xl font-black text-primary">
              <AnimatedCounter to={s.to} suffix={s.suffix} />
            </div>
            <div className="mt-2 text-sm uppercase tracking-widest text-muted-foreground font-semibold">{s.l}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="py-28 px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
          className="relative">
          <img src={teacher} alt="Teacher at Balo English Medium School" width={1200} height={900} loading="lazy"
            className="rounded-3xl shadow-card w-full aspect-[4/5] object-cover" />
          <motion.div animate={{ rotate: [0, 3, 0, -3, 0] }} transition={{ duration: 8, repeat: Infinity }}
            className="absolute -bottom-8 -right-4 md:-right-12 bg-card rounded-2xl p-6 shadow-card max-w-xs">
            <Quote className="size-7 text-accent mb-2" />
            <p className="text-sm italic">"Education is the spark that lights up an entire neighborhood."</p>
            <div className="mt-3 text-xs font-semibold tracking-widest uppercase text-muted-foreground">— Founder</div>
          </motion.div>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <div className="text-xs uppercase tracking-[0.2em] text-accent font-bold mb-4">Our Story</div>
          <h2 className="text-balance text-4xl md:text-5xl font-bold leading-tight">
            A neighborhood school built on love, run by hope.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Tucked into a narrow lane in Salkia, Howrah, Balo English Medium School began with a simple promise: no child in our community would be denied the right to learn because of poverty. Today, we welcome every child through our doors — free of cost — and walk with them from their first English alphabet to their first big dream.
          </p>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            We are parents, teachers, neighbours, and volunteers. We are the village it takes to raise a generation.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {[
              { icon: BookOpen, t: "English-Medium", d: "Foundations that open every door." },
              { icon: HandHeart, t: "Always Free", d: "No fees. No barriers. Ever." },
              { icon: Users, t: "Community-Run", d: "By the neighbourhood, for the neighbourhood." },
              { icon: Heart, t: "Whole-Child", d: "Books, meals, dignity, joy." },
            ].map((f, i) => (
              <motion.div
                key={f.t}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                whileHover={{ scale: 1.05, y: -4 }}
                className="flex gap-3 p-4 rounded-2xl bg-card border border-border cursor-default shadow-soft"
              >
                <f.icon className="size-5 text-primary shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-sm">{f.t}</div>
                  <div className="text-xs text-muted-foreground mt-1">{f.d}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Programs() {
  const items = [
    { img: reading, t: "Primary Learning", d: "Foundational reading, writing & arithmetic in English and Bengali." },
    { img: teacher, t: "Spoken English", d: "Daily conversation circles to build confidence and fluency." },
    { img: playground, t: "Play & Wellbeing", d: "Sports, art, and emotional learning — every afternoon." },
    { img: hands, t: "Tutoring & Mentorship", d: "After-school support for older students preparing for boards." },
  ];
  return (
    <section id="programs" className="py-28 px-6 bg-card">
      <div className="max-w-7xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="max-w-2xl">
          <div className="text-xs uppercase tracking-[0.2em] text-accent font-bold mb-4">What We Do</div>
          <h2 className="text-4xl md:text-5xl font-bold">Programs that meet children where they are.</h2>
        </motion.div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((it, i) => (
            <motion.article key={it.t} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i}
              whileHover={{ y: -8 }}
              className="group rounded-3xl overflow-hidden bg-background border border-border shadow-soft">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={it.img} alt={it.t} width={1200} height={900} loading="lazy"
                  className="size-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="p-6">
                <h3 className="font-display text-xl font-bold">{it.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{it.d}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  const imgs = [
    { src: classroom1, span: "md:col-span-2 md:row-span-2", a: "Classroom at Balo" },
    { src: hands, span: "", a: "Raised hands" },
    { src: portrait, span: "", a: "Student portrait" },
    { src: playground, span: "", a: "Playground joy" },
    { src: classroom2, span: "md:col-span-2", a: "Students reading" },
    { src: teacher, span: "", a: "Teacher and class" },
    { src: books, span: "", a: "Books" },
  ];
  return (
    <section id="gallery" className="py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-accent font-bold mb-4">Gallery</div>
            <h2 className="text-4xl md:text-5xl font-bold max-w-xl text-balance">Moments from our classrooms.</h2>
          </div>
          <p className="text-muted-foreground max-w-sm">Real days, real children, real progress — captured around our little school in Salkia.</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[180px] md:auto-rows-[220px] gap-4">
          {imgs.map((im, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className={`relative overflow-hidden rounded-2xl shadow-soft ${im.span}`}>
              <LazyImage src={im.src} alt={im.a} className="absolute inset-0 size-full object-cover hover:scale-110 transition-transform duration-700" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Impact() {
  return (
    <section id="impact" className="py-28 px-6 relative overflow-hidden gradient-hero text-white">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
        backgroundSize: "40px 40px, 60px 60px",
      }} />
      <div className="relative max-w-5xl mx-auto text-center">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <div className="text-xs uppercase tracking-[0.25em] text-secondary font-bold mb-5">Voices from the Community</div>
          <Quote className="size-12 mx-auto opacity-60" />
          <p className="mt-6 text-2xl md:text-4xl font-display font-medium text-balance leading-snug">
            "My daughter walks to Balo English Medium School every morning with her head held high. She speaks English now — and she believes she can become anything."
          </p>
          <div className="mt-8 text-sm tracking-widest uppercase text-white/80">— A parent from Pilkhana</div>
        </motion.div>
      </div>
    </section>
  );
}

function Donate() {
  return (
    <section id="donate" className="py-28 px-6">
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
        className="max-w-5xl mx-auto rounded-[2rem] gradient-warm border border-border p-10 md:p-16 text-center shadow-card">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 text-accent px-4 py-1.5 text-xs font-semibold mb-6">
          <HandHeart className="size-4" /> Be part of the story
        </div>
        <h2 className="text-4xl md:text-6xl font-bold text-balance leading-tight">
          ₹500 sends a child to school for <span className="text-accent italic">a whole month.</span>
        </h2>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Your gift funds books, uniforms, a warm meal, and a teacher who shows up every single day. 100% of your donation reaches our classrooms.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="https://www.balousa.org/donation-confirmation/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-8 py-4 font-semibold shadow-soft hover:scale-105 transition-transform">
            Donate Now <Heart className="size-4" />
          </a>
          <a href="#contact" className="inline-flex items-center gap-2 rounded-full border-2 border-primary text-primary px-8 py-4 font-semibold hover:bg-primary hover:text-primary-foreground transition-colors">
            Volunteer With Us
          </a>
        </div>
      </motion.div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="py-28 px-6 bg-card">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <div className="text-xs uppercase tracking-[0.2em] text-accent font-bold mb-4">Visit · Call · Write</div>
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-balance">Come see our school, anytime.</h2>
          <div className="space-y-6">
            {[
              { icon: MapPin, t: "Our Address", d: "55 Pilkhana 2nd Bye Lane, Howrah Salkia 711101" },
              { icon: Phone, t: "Call Us", d: "Reach out to schedule a visit or learn more." },
              { icon: Mail, t: "Email", d: "baloindia2015@gmail.com" },
            ].map((c) => (
              <div key={c.t} className="flex gap-4">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center shrink-0">
                  <c.icon className="size-5" />
                </div>
                <div>
                  <div className="font-semibold">{c.t}</div>
                  <div className="text-muted-foreground text-sm mt-1 max-w-sm">{c.d}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="rounded-3xl overflow-hidden shadow-card aspect-square lg:aspect-auto">
          <iframe
            title="Balo English Medium School location"
            src="https://www.google.com/maps?q=22.594829,88.336977&output=embed"
            className="size-full border-0"
            loading="lazy"
          />
        </motion.div>
      </div>
    </section>
  );
}


function Banner() {
  return (
    <section className="py-16 px-6 bg-card">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <div className="text-xs uppercase tracking-[0.25em] text-accent font-bold mb-3">Glimpses of Balo</div>
          <h2 className="text-3xl md:text-4xl font-bold text-balance">A few hundred faces, one shared family.</h2>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="rounded-3xl overflow-hidden shadow-card"
        >
          <img src={banner} alt="Collage of Balo English Medium School students, staff and moments" className="w-full h-auto object-cover" loading="lazy" />
        </motion.div>
      </div>
    </section>
  );
}

function Index() {
  return (
    <main>
      <Hero />
      <Stats />
      <Banner />
      <About />
      <Programs />
      <Gallery />
      <Impact />
      <Donate />
      <Contact />
    </main>
  );
}


