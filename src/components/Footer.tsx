import { Link } from "@tanstack/react-router";
import { GraduationCap, Mail, MapPin, Heart, Phone } from "lucide-react";
import {
  DONATE_URL,
  FACEBOOK_URL,
  FEE_STATEMENT_SHORT,
  INSTAGRAM_URL,
  SCHOOL_ADDRESS_TEXT,
  SCHOOL_EMAIL,
  SCHOOL_NAME,
  SCHOOL_PHONE_DISPLAY,
  SCHOOL_PHONE_HREF,
} from "@/lib/school-facts";

const explore = [
  { to: "/", label: "Home" },
  { to: "/about", label: "Leadership" },
  { to: "/staff", label: "Staff" },
  { to: "/life-at-balo", label: "Life at BALO" },
  { to: "/welfare-society", label: "Welfare Society" },
  { to: "/events", label: "Notices & Events" },
  { to: "/facilities", label: "Facilities" },
  { to: "/subjects", label: "Academics" },
  { to: "/gallery", label: "Gallery" },
  { to: "/rules", label: "Rules" },
  { to: "/calendar", label: "Calendar" },
];

const connect = [
  { to: "/enquiry", label: "Enquiry" },
  { to: "/faq", label: "FAQ" },
  { to: "/volunteers", label: "Volunteers" },
  { to: "/virtual-tour", label: "Virtual Tour" },
  { to: "/developers", label: "Developers" },
  { to: "/balo-ai", label: "BALO AI" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card px-6 py-14">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl gradient-hero">
              <GraduationCap className="size-5 text-white" />
            </div>
            <div>
              <div className="font-display font-bold">{SCHOOL_NAME}</div>
              <div className="text-xs text-muted-foreground">Salkia, Howrah · A community NGO</div>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Free English-medium education for the children of Babudanga and Pilkhana — books, a
            meal, and a classroom that welcomes every child. {FEE_STATEMENT_SHORT}
          </p>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{SCHOOL_ADDRESS_TEXT}</span>
            </p>
            <a href={SCHOOL_PHONE_HREF} className="flex items-center gap-2 hover:text-primary">
              <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
              {SCHOOL_PHONE_DISPLAY}
            </a>
            <a
              href={`mailto:${SCHOOL_EMAIL}`}
              className="flex items-center gap-2 hover:text-primary"
            >
              <Mail className="size-4 shrink-0 text-primary" aria-hidden="true" />
              {SCHOOL_EMAIL}
            </a>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Balo on Instagram"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
              Instagram
            </a>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Balo on Facebook"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
              Facebook
            </a>
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
            >
              <Heart className="size-3.5" />
              Donate
            </a>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Explore</div>
          <ul className="mt-4 space-y-2 text-sm">
            {explore.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Connect</div>
          <ul className="mt-4 space-y-2 text-sm">
            {connect.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-7xl border-t border-border pt-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SCHOOL_NAME}. Built with love by our students.
      </div>
    </footer>
  );
}
