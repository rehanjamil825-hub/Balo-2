import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Heart, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Home", href: "/", hash: undefined },
  { label: "About", href: "/about", hash: "about" },
  { label: "Facilities", href: "/facilities", hash: undefined },
  { label: "Extracurricular", href: "/extracurricular", hash: undefined },
  { label: "Contact", href: "/", hash: "contact" },
];

export function Nav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClasses =
    "text-sm font-medium text-foreground/70 hover:text-foreground transition-colors";

  return (
    <motion.nav
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/50"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-9 rounded-xl gradient-hero grid place-items-center shadow-soft">
            <GraduationCap className="size-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-lg">Balo English</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              School · Howrah
            </div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => {
            if (isHome && item.hash) {
              return (
                <a key={item.label} href={`#${item.hash}`} className={linkClasses}>
                  {item.label}
                </a>
              );
            }
            return (
              <Link
                key={item.label}
                to={item.href}
                className={linkClasses}
                activeProps={{ className: "text-foreground font-semibold" }}
                activeOptions={{ exact: true }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <Link
          to="/#donate"
          className="hidden md:inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-semibold shadow-soft hover:scale-105 transition-transform"
        >
          <Heart className="size-4" /> Donate
        </Link>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden border-t border-border/50"
          >
            <div className="px-6 py-4 space-y-3">
              {navItems.map((item) => {
                if (isHome && item.hash) {
                  return (
                    <a
                      key={item.label}
                      href={`#${item.hash}`}
                      className="block text-sm font-medium text-foreground/70 hover:text-foreground"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </a>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="block text-sm font-medium text-foreground/70 hover:text-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                to="/#donate"
                className="inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-5 py-2 text-sm font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                <Heart className="size-4" /> Donate
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
