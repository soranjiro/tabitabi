import { describe, expect, it } from "vitest";
import { firebaseMessage } from "./firebase-error-message";

describe("firebaseMessage", () => {
  it("explains unapproved production domains", () => {
    expect(firebaseMessage({ code: "auth/unauthorized-continue-uri" })).toContain("承認済みドメイン");
    expect(firebaseMessage({ code: "auth/unauthorized-domain" })).toContain("承認済みドメイン");
  });

  it("distinguishes callback configuration from provider configuration", () => {
    expect(firebaseMessage({ code: "auth/invalid-continue-uri" })).toContain("戻り先URL");
    expect(firebaseMessage({ code: "auth/operation-not-allowed" })).toContain("ログイン方法");
  });

  it("distinguishes network, quota, and expired links", () => {
    expect(firebaseMessage({ code: "auth/network-request-failed" })).toContain("通信環境");
    expect(firebaseMessage({ code: "auth/quota-exceeded" })).toContain("上限");
    expect(firebaseMessage({ code: "auth/expired-action-code" })).toContain("期限切れ");
  });

  it("exposes only safe Firebase error codes, never raw exceptions", () => {
    expect(firebaseMessage({ code: "auth/unexpected-error", message: "token=secret" })).toContain("auth/unexpected-error");
    expect(firebaseMessage({ code: "arbitrary secret", message: "token=secret" })).not.toContain("secret");
    expect(firebaseMessage(new Error("token=secret"))).not.toContain("secret");
  });
});
