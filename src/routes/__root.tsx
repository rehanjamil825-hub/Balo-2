import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Nav } from "../components/Nav";
import { AnnouncementBanner } from "../components/AnnouncementBanner";
import { LoadingScreen } from "../components/LoadingScreen";
import { Footer } from "../components/Footer";
import { LanguageProvider } from "../lib/i18n";
import { BaloAIButton } from "../components/BaloAIButton";
import { NoticeBell } from "../components/NoticeBell";
import {
  SCHOOL_ADDRESS,
  SCHOOL_EMAIL,
  SCHOOL_NAME,
  SCHOOL_PHONE_DISPLAY,
  SCHOOL_STATS,
  SITE_URL,
  SOCIAL_IMAGE_PATH,
  absoluteUrl,
} from "../lib/school-facts";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${SCHOOL_NAME} — Free Education for Every Child in Howrah` },
      {
        name: "description",
        content:
          "Balo English Medium School is a free English-medium school in Salkia, Howrah, giving children of Pilkhana and Babudanga an education, a hot meal and a safe place to learn.",
      },
      { name: "theme-color", content: "#1f5f4b" },
      { property: "og:site_name", content: SCHOOL_NAME },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_IN" },
      {
        property: "og:title",
        content: `${SCHOOL_NAME} — Free Education for Every Child in Howrah`,
      },
      {
        property: "og:description",
        content:
          "A 4.4★ rated community school in Salkia, Howrah giving children free, quality English-medium learning.",
      },
      { property: "og:image", content: absoluteUrl(SOCIAL_IMAGE_PATH) },
      {
        property: "og:image:alt",
        content: "Students and volunteers together at Balo English Medium School",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: `${SCHOOL_NAME} — Free Education for Every Child in Howrah`,
      },
      {
        name: "twitter:description",
        content:
          "Free English-medium education, a hot meal and a safe classroom for the children of Pilkhana and Babudanga, Howrah.",
      },
      { name: "twitter:image", content: absoluteUrl(SOCIAL_IMAGE_PATH) },
      { name: "robots", content: "index, follow" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "School",
          name: SCHOOL_NAME,
          url: SITE_URL,
          logo: absoluteUrl("/favicon.png"),
          image: absoluteUrl(SOCIAL_IMAGE_PATH),
          email: SCHOOL_EMAIL,
          telephone: SCHOOL_PHONE_DISPLAY,
          foundingDate: String(SCHOOL_STATS.foundedYear),
          address: {
            "@type": "PostalAddress",
            streetAddress: `${SCHOOL_ADDRESS.line1}, ${SCHOOL_ADDRESS.line2}`,
            addressLocality: SCHOOL_ADDRESS.city,
            addressRegion: SCHOOL_ADDRESS.region,
            postalCode: SCHOOL_ADDRESS.postalCode,
            addressCountry: SCHOOL_ADDRESS.countryCode,
          },
          sameAs: [
            "https://www.balousa.org/",
            "https://balo.ie/",
            "https://www.balo.it/en/",
            "https://www.instagram.com/associazionebalo/",
            "https://www.facebook.com/baloODV/",
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Skip to content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function HashScroller() {
  const hash = useRouterState({ select: (s) => s.location.hash });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prevPath = useRef(pathname);

  useEffect(() => {
    // Hash: smooth-scroll to the anchor once the target has mounted.
    if (hash) {
      const id = hash.replace(/^#/, "");
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.getElementById(id);
          if (!el) return;
          const top = el.getBoundingClientRect().top + window.scrollY - 130;
          window.scrollTo({ top, behavior: "smooth" });
        });
      });
      return () => cancelAnimationFrame(raf);
    }

    // Real page change (not just search-param updates): scroll to top AFTER
    // the page-entry animation has had time to play (~450ms) so animations
    // trigger from a static top position instead of immediately during nav.
    // Browser back/forward is handled by the router's built-in
    // scrollRestoration, which fires before this effect runs.
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      const t = window.setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "auto" });
      }, 450);
      return () => window.clearTimeout(t);
    }
  }, [pathname, hash]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdminShellRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminLogin = pathname === "/admin-login";
  // BALO AI is a full-screen chat surface: no marquee, no footer.
  const isChatRoute = pathname.startsWith("/balo-ai");
  const isBare = isAdminShellRoute || isChatRoute;

  // The splash screen is a pure overlay. Page HTML is always server-rendered
  // and present in the document, so search engines see the real content even
  // while the animation is still playing.
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        {/*
          Animation entry states are inline styles (opacity: 0), which would hide
          the page if JavaScript never runs. This is the no-JS fallback: make
          everything visible and leave it still.
        */}
        <noscript>
          <style
            dangerouslySetInnerHTML={{
              __html:
                '.balo-splash{display:none !important}[style*="opacity:0"],[style*="opacity: 0"]{opacity:1 !important;transform:none !important;filter:none !important}',
            }}
          />
        </noscript>
        <LoadingScreen />
        {!isAdminShellRoute && !isChatRoute && <Nav />}
        {!isBare && !isAdminLogin && <AnnouncementBanner />}
        <HashScroller />
        <div
          id="main-content"
          tabIndex={-1}
          className={isBare ? "" : isAdminLogin ? "pt-[72px]" : "pt-9"}
        >
          <Outlet />
        </div>
        {!isBare && <Footer />}
        {!isBare && <BaloAIButton />}
        {!isBare && <NoticeBell />}
      </LanguageProvider>
    </QueryClientProvider>
  );
}
