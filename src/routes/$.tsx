import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, Section } from "@/components/page-kit";

/**
 * Catch-all for unknown URLs.
 *
 * Rendering a real page (instead of the router's built-in "not found" branch)
 * gives unknown URLs their own title and description. The page is marked
 * `noindex, follow` and deliberately carries no canonical link, so search
 * engines drop the dead URL instead of treating it as the home page.
 */
export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "Page not found — Balo English Medium School" },
      {
        name: "description",
        content: "That page does not exist. Use the links below to find what you need.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: NotFoundPage,
});

function NotFoundPage() {
  return (
    <>
      <PageHero
        eyebrow="404"
        title="We couldn't find that page"
        lead="The link may be old, or the address may have a typo. Everything on this site is one tap away below."
      />
      <Section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { to: "/", label: "Home" },
            { to: "/about", label: "About the school" },
            { to: "/subjects", label: "Academics" },
            { to: "/staff", label: "Our staff" },
            { to: "/enquiry", label: "Contact and admissions" },
            { to: "/faq", label: "Frequently asked questions" },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-2xl border border-border bg-card p-5 text-sm font-semibold shadow-soft transition-colors hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
