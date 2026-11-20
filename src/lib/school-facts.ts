/**
 * Canonical, single-source school facts.
 *
 * Every page, structured-data block, footer, search entry and BALO AI prompt
 * reads these values instead of repeating them. That is what keeps the fee
 * statement, founder story, address and phone number from drifting apart
 * between pages (issue: "conflicting school facts").
 *
 * Change a fact here and it changes everywhere.
 */

/** Public site origin. Set VITE_SITE_URL on the deployment to override. */
export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || "https://baloindia.org"
).replace(/\/$/, "");

export const SCHOOL_NAME = "Balo English Medium School";
export const SCHOOL_SHORT_NAME = "BALO";
export const SCHOOL_LEGAL_NAME = "BALO Welfare Society";

export const SCHOOL_EMAIL = "baloindia2015@gmail.com";

/** School office phone, as published on the Balo Association India profile. */
export const SCHOOL_PHONE_DISPLAY = "+91 93315 27486";
export const SCHOOL_PHONE_HREF = "tel:+919331527486";

export const SCHOOL_ADDRESS = {
  line1: "55, Madar Talla Lane",
  line2: "Babudanga, Pilkhana, Salkia",
  city: "Howrah",
  region: "West Bengal",
  postalCode: "711101",
  country: "India",
  countryCode: "IN",
} as const;

export const SCHOOL_ADDRESS_LINES = [
  SCHOOL_ADDRESS.line1,
  SCHOOL_ADDRESS.line2,
  `${SCHOOL_ADDRESS.city}, ${SCHOOL_ADDRESS.region} ${SCHOOL_ADDRESS.postalCode}`,
  SCHOOL_ADDRESS.country,
] as const;

/** One-line postal address used in prose, cards and BALO AI context. */
export const SCHOOL_ADDRESS_TEXT =
  `${SCHOOL_ADDRESS.line1}, ${SCHOOL_ADDRESS.line2}, ` +
  `${SCHOOL_ADDRESS.city}, ${SCHOOL_ADDRESS.region} ${SCHOOL_ADDRESS.postalCode}, ${SCHOOL_ADDRESS.country}`;

/** Google Maps pin already used by the home page map embed. */
export const SCHOOL_MAP_QUERY = "22.594829,88.336977";

export const SCHOOL_STATS = {
  foundedYear: 2006,
  /** The international BALO movement began when the three founders met. */
  movementStarted: "August 2005",
  students: "480",
  staff: "20+",
  rating: "4.4",
  reviews: "15",
} as const;

export const SCHOOL_HOURS = "10:00 AM – 3:40 PM (weekdays)";

/**
 * The single fee statement. BALO is a free school: this sentence (and its
 * short forms) must be used everywhere instead of "fees are kept low".
 */
export const FEE_STATEMENT =
  "Education at Balo English Medium School is completely free — no tuition fee, no admission fee and no hidden costs.";

export const FEE_STATEMENT_SHORT = "Free education — no fees, no hidden costs.";

export const FOUNDERS = [
  {
    name: "Elisabetta “Betta” Ravaioli",
    role: "Founder of BALO (Italy)",
    note: "Italian educator who founded the school in Howrah in 2006 and inspired Balo Italia.",
  },
  {
    name: "Liam Ashe",
    role: "Co-founder, chairperson of Balo Children Ireland",
    note: "Met Betta in Kolkata in August 2005 and helped build the international BALO movement.",
  },
  {
    name: "Anne “Anna” Leache",
    role: "Co-founder, Balo USA coordinator",
    note: "Volunteered in Kolkata in 2005 and helps coordinate Balo USA's support for India.",
  },
] as const;

/** The one-paragraph founder story used by pages and BALO AI. */
export const FOUNDING_STORY =
  "BALO began in August 2005 when Italian educator Elisabetta “Betta” Ravaioli, Liam Ashe from Ireland and Anne Leache from the USA met while volunteering in Kolkata. Balo English Medium School opened in Salkia, Howrah in 2006 under Betta's guidance, with Liam and Anne going on to lead the sister organisations Balo Children Ireland and Balo USA. Today the school is directed by Mrs Rehana Khatoon and led by Principal Mrs Roshan Ara.";

export const DONATE_URL = "https://www.balousa.org/donation-confirmation/";
export const INSTAGRAM_URL = "https://www.instagram.com/associazionebalo/";
export const FACEBOOK_URL = "https://www.facebook.com/baloODV/";
export const SISTER_ORGS = {
  ireland: "https://balo.ie/",
  usa: "https://www.balousa.org/",
  italia: "https://www.balo.it/en/",
} as const;

/** Social preview image served from /public. */
export const SOCIAL_IMAGE_PATH = "/og-balo.jpg";

/** Absolute URL for a path on this site. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean}`;
}

/** Canonical link descriptor for a route's `head().links`. */
export function canonicalLink(path: string) {
  return { rel: "canonical", href: absoluteUrl(path) };
}
