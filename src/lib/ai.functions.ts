import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const enquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().nullable(),
  subject: z.string().trim().min(2).max(150),
  message: z.string().trim().min(5).max(2000),
});

export const submitEnquiry = createServerFn({ method: "POST" })
  .inputValidator((i) => enquirySchema.parse(i))
  .handler(async ({ data }) => {
    // Enquiries are public and trigger office email, so keep them rate limited.
    const request = getRequest();
    const { clientAddress, rateLimit } = await import("@/lib/rate-limit.server");
    const ip = request ? clientAddress(request) : "unknown";
    const limit = rateLimit(`enquiry:${ip}`, 5, 60 * 60_000);
    if (!limit.ok) {
      throw new Error(
        "You have sent several enquiries already. Please wait an hour, or email baloindia2015@gmail.com directly.",
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("enquiries").insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: data.subject,
      message: data.message,
    });
    if (error) throw new Error("Could not send your enquiry. Please try again.");
    return { ok: true };
  });
