import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

type Feature = "chat" | "enquiry" | "admin";

type Health = {
  ok?: boolean;
  runtime?: string;
  features?: {
    serverFunctions?: boolean;
    chat?: boolean;
    enquiry?: boolean;
    admin?: boolean;
  };
};

type Probe =
  | { state: "checking" }
  | { state: "ok" }
  | { state: "not-configured"; feature: Feature }
  | { state: "static-host" };

let cached: Probe | null = null;
let inflight: Promise<Probe> | null = null;

/**
 * Ask the server whether a feature is usable here.
 *
 * A static-only deployment (for example CloudFront in front of an S3 bucket)
 * answers `/api/health` with HTML, which is why the chat, enquiry and admin
 * screens used to fail without explaining why.
 */
async function probe(): Promise<Probe> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const response = await fetch("/api/health", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.includes("application/json")) {
        cached = { state: "static-host" };
        return cached;
      }
      const body = (await response.json()) as Health;
      if (!body.features?.serverFunctions) {
        cached = { state: "static-host" };
        return cached;
      }
      const configured = body.features.chat;
      cached = { state: "ok" };
      return configured === false ? { state: "not-configured", feature: "chat" } : cached;
    } catch {
      cached = { state: "static-host" };
      return cached;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

function messageFor(probe: Probe, feature: Feature): string | null {
  if (probe.state === "static-host") {
    return feature === "chat"
      ? "BALO AI needs the school's Node server, and this deployment is static. Please use the school's own address, or email baloindia2015@gmail.com."
      : "This form needs the school's Node server, and this deployment is static. Please email baloindia2015@gmail.com or call +91 93315 27486.";
  }
  if (probe.state === "not-configured" && feature === "chat") {
    return "BALO AI is not configured on this server yet. Please email baloindia2015@gmail.com and the school office will help.";
  }
  return null;
}

/** Inline banner shown only when the deployment cannot serve the feature. */
export function ServerStatusNotice({ feature }: { feature: Feature }) {
  const [state, setState] = useState<Probe>({ state: "checking" });

  useEffect(() => {
    let alive = true;
    probe().then((result) => {
      if (alive) setState(result);
    });
    return () => {
      alive = false;
    };
  }, []);

  const message = messageFor(state, feature);
  if (!message) return null;

  return (
    <div
      role="status"
      className="mx-auto mb-4 flex max-w-3xl items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
