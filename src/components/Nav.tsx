import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Menu, X } from "lucide-react";
import { useState } from "react";
import baloLogo from "@/assets/balo-logo.jpg.asset.json";

type NavItem = { label: string; href: string; hash?: string };

const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Facilities", href: "/facilities" },
  { label: "Extracurricular", href: "/extracurricular" },
  { label: "Developers", href: "/developers" },
  { label: "Contact", href: "/", hash: "contact" },
];

const DONATE_URL = "https://www.balousa.org/donation-confirmation/";

export function Nav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClasses =
    "text-sm font-medium text-foreground/70 hover:text-foreground transition-colors cursor-pointer";

  const handleHashClick = (e: React.MouseEvent, hash: string) => {
    e.preventDefault();
    setMobileOpen(false);
    if (isHome) {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `#${hash}`);
    } else {
      navigate({ to: "/", hash });
    }
  };

  const renderItem = (item: NavItem, mobile = false) => {
    const className = mobile
      ? "block text-sm font-medium text-foreground/70 hover:text-foreground cursor-pointer"
      : linkClasses;

    if (item.hash) {
      return (
        <a
          key={item.label}
          href={`#${item.hash}`}
          className={className}
          onClick={(e) => handleHashClick(e, item.hash!)}
        >
          {item.label}
        </a>
      );
    }
    return (
      <Link
        key={item.label}
        to={item.href}
        className={className}
        activeProps={{ className: `${className} text-foreground font-semibold` }}
        activeOptions={{ exact: true }}
        onClick={() => setMobileOpen(false)}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <motion.nav
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/50"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-10 rounded-full overflow-hidden shadow-soft ring-2 ring-accent/40">
            <img src={baloLogo.url} alt="Balo India logo" className="w-full h-full object-cover" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-lg">Balo India</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              School · Howrah
            </div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => renderItem(item))}
        </div>

        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-semibold shadow-soft hover:scale-105 transition-transform"
        >
          <Heart className="size-4" /> Donate
        </a>

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
              {navItems.map((item) => renderItem(item, true))}
              <a
                href={DONATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-5 py-2 text-sm font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                <Heart className="size-4" /> Donate
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
