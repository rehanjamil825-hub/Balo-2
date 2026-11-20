import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { PageHero, Section, Reveal } from "@/components/page-kit";
import { ServerStatusNotice } from "@/components/ServerStatusNotice";
import { submitEnquiry } from "@/lib/ai.functions";
import {
  SCHOOL_ADDRESS_TEXT,
  SCHOOL_EMAIL,
  SCHOOL_PHONE_DISPLAY,
  SCHOOL_PHONE_HREF,
} from "@/lib/school-facts";
import reception from "@/assets/reception1.jpg";
import { absoluteUrl, canonicalLink } from "@/lib/school-facts";

export const Route = createFileRoute("/enquiry")({
  head: () => ({
    meta: [
      { title: "Enquiry & Contact — Balo English Medium School, Howrah" },
      {
        name: "description",
        content:
          "Send an enquiry to Balo English Medium School, Salkia, Howrah — admissions, volunteering, donations or general questions. Our office replies by email.",
      },
      { property: "og:title", content: "Enquiry & Contact — Balo English Medium School" },
      {
        property: "og:description",
        content: "Questions about admissions, volunteering or supporting BALO? Write to us.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: absoluteUrl("/og-balo.jpg") },
    ],
    links: [canonicalLink("/enquiry")],
  }),
  component: EnquiryPage,
});

function EnquiryPage() {
  const send = useServerFn(submitEnquiry);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await send({
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          subject: form.subject.trim(),
          message: form.message.trim(),
        },
      });
      setDone(true);
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      // A static-only host answers with HTML instead of the server function:
      // say so plainly instead of blaming the visitor's form.
      const looksStatic = /HTML|unexpected token|Failed to fetch|NetworkError|404/i.test(message);
      setError(
        looksStatic
          ? `The enquiry form needs the BALO Node server and it is not reachable here. Please email ${SCHOOL_EMAIL} or call ${SCHOOL_PHONE_DISPLAY}.`
          : message || "Could not send your enquiry. Please check the form and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none transition focus:border-primary";

  return (
    <main>
      <PageHero
        eyebrow="Enquiry"
        title="Talk to the school"
        highlight="office."
        lead="Admissions, volunteering, donations or a simple question — send us a note and our office will get back to you by email."
        image={reception}
      />

      <Section>
        <ServerStatusNotice feature="enquiry" />
        <div className="grid gap-8 lg:grid-cols-[1.2fr_minmax(0,1fr)]">
          <Reveal>
            <form
              onSubmit={onSubmit}
              className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-soft"
            >
              {done ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <CheckCircle2 className="size-10 text-primary" />
                  <h2 className="font-display text-2xl font-bold">Enquiry sent</h2>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Thank you — your enquiry has reached the BALO school office. We'll reply to the
                    email address you gave us.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDone(false)}
                    className="mt-2 rounded-full border border-border px-5 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold">Your name</span>
                      <input
                        required
                        minLength={2}
                        maxLength={100}
                        value={form.name}
                        onChange={set("name")}
                        className={field}
                        placeholder="Full name"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold">Email</span>
                      <input
                        required
                        type="email"
                        maxLength={255}
                        value={form.email}
                        onChange={set("email")}
                        className={field}
                        placeholder="you@example.com"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold">
                        Phone <span className="font-normal text-muted-foreground">(optional)</span>
                      </span>
                      <input
                        maxLength={30}
                        value={form.phone}
                        onChange={set("phone")}
                        className={field}
                        placeholder="+91…"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold">Subject</span>
                      <input
                        required
                        minLength={2}
                        maxLength={150}
                        value={form.subject}
                        onChange={set("subject")}
                        className={field}
                        placeholder="Admission enquiry"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">Message</span>
                    <textarea
                      required
                      minLength={5}
                      maxLength={2000}
                      rows={6}
                      value={form.message}
                      onChange={set("message")}
                      className={field}
                      placeholder="How can we help?"
                    />
                  </label>

                  {error && (
                    <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    {busy ? "Sending…" : "Send enquiry"}
                  </button>
                </>
              )}
            </form>
          </Reveal>

          <Reveal i={1}>
            <div className="space-y-4">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <MapPin className="size-5" />
                </div>
                <h3 className="font-display text-lg font-bold">Visit us</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {SCHOOL_ADDRESS_TEXT}
                </p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Phone className="size-5" aria-hidden="true" />
                </div>
                <h3 className="font-display text-lg font-bold">Call the office</h3>
                <a
                  href={SCHOOL_PHONE_HREF}
                  className="mt-2 block text-sm font-semibold text-primary underline"
                >
                  {SCHOOL_PHONE_DISPLAY}
                </a>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Mail className="size-5" aria-hidden="true" />
                </div>
                <h3 className="font-display text-lg font-bold">Email the office</h3>
                <a
                  href={`mailto:${SCHOOL_EMAIL}`}
                  className="mt-2 block text-sm font-semibold text-primary underline"
                >
                  {SCHOOL_EMAIL}
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>
    </main>
  );
}
