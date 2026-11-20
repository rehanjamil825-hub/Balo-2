import { createFileRoute } from "@tanstack/react-router";

/**
 * Deployment health check.
 *
 * The site needs a Node server for BALO AI, the enquiry form and the admin
 * dashboard. A static-only host (for example an S3/CloudFront export) serves
 * the pages but answers these endpoints with HTML, which used to fail silently.
 * Hitting `/api/health` tells you immediately which deployment you are on.
 */
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const has = (name: string) => Boolean(process.env[name]?.trim());
        const supabaseReady =
          has("SUPABASE_URL") &&
          (has("SUPABASE_SERVICE_ROLE_KEY") || has("SUPABASE_PUBLISHABLE_KEY"));
        const chatKeys =
          has("BALO_ASSISTANT_API_KEY") || has("GEMINI_API_KEY") || has("BALO_STUDENT_API_KEY");

        const body = {
          ok: true,
          service: "balo-website",
          runtime: "node",
          time: new Date().toISOString(),
          features: {
            /** False means the deployment is static: chat/enquiry/admin cannot work. */
            serverFunctions: true,
            chat: chatKeys,
            enquiry: supabaseReady,
            admin: supabaseReady && has("SUPABASE_SERVICE_ROLE_KEY"),
          },
        };

        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
