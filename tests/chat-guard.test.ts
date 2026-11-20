import { describe, expect, test } from "bun:test";
import {
  checkAll,
  clientAddress,
  isSameOriginRequest,
  rateLimit,
} from "../src/lib/rate-limit.server";
import { resolveChatIdentity } from "../src/lib/chat-guard.server";

const post = (headers: Record<string, string>, url = "https://baloindia.org/api/chat") =>
  new Request(url, { method: "POST", headers });

describe("rate limiting", () => {
  test("blocks after the limit and reports a retry window", () => {
    expect(rateLimit("unit-a", 2, 60_000).ok).toBe(true);
    expect(rateLimit("unit-a", 2, 60_000).ok).toBe(true);
    const blocked = rateLimit("unit-a", 2, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  test("checkAll counts a single hit and respects existing windows", () => {
    expect(checkAll([{ key: "unit-b", limit: 2, windowMs: 60_000 }]).ok).toBe(true);
    expect(checkAll([{ key: "unit-b", limit: 2, windowMs: 60_000 }]).ok).toBe(true);
    expect(checkAll([{ key: "unit-b", limit: 2, windowMs: 60_000 }]).ok).toBe(false);
  });

  test("keys are independent", () => {
    expect(rateLimit("unit-c", 1, 60_000).ok).toBe(true);
    expect(rateLimit("unit-c", 1, 60_000).ok).toBe(false);
    expect(rateLimit("unit-d", 1, 60_000).ok).toBe(true);
  });
});

describe("chat request checks", () => {
  test("only same-origin posts are accepted", () => {
    expect(isSameOriginRequest(post({ origin: "https://baloindia.org" }))).toBe(true);
    expect(isSameOriginRequest(post({ origin: "https://attacker.example" }))).toBe(false);
    expect(
      isSameOriginRequest(
        post({ origin: "http://localhost:5173" }, "http://localhost:5173/api/chat"),
      ),
    ).toBe(true);
  });

  test("the client address comes from the proxy header", () => {
    expect(clientAddress(post({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
  });

  test("visitor cookies are signed and tampering is rejected", () => {
    const first = resolveChatIdentity(post({}));
    expect(first.id).toBeTruthy();
    expect(first.setCookie).toBeTruthy();

    const cookie = first.setCookie!.split(";")[0]!;
    const repeat = resolveChatIdentity(post({ cookie }));
    expect(repeat.id).toBe(first.id);
    expect(repeat.setCookie).toBeUndefined();

    const tampered = resolveChatIdentity(post({ cookie: `balo_ai_id=${first.id}.AAAAAAAA` }));
    expect(tampered.id).not.toBe(first.id);
  });
});
