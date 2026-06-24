import { GraduationCap } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-6 text-sm">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl gradient-hero grid place-items-center">
            <GraduationCap className="size-5 text-white" />
          </div>
          <div>
            <div className="font-display font-bold">Balo English School</div>
            <div className="text-xs text-muted-foreground">Salkia, Howrah · A community NGO</div>
          </div>
        </div>
        <div className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} Balo English School. Built with love by our community.
        </div>
      </div>
    </footer>
  );
}
