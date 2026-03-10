import { WebhookSigner } from "../webhook.signer";

describe("WebhookSigner", () => {
  let signer: WebhookSigner;

  beforeEach(() => {
    signer = new WebhookSigner();
  });

  describe("sign", () => {
    it("produces consistent HMAC for the same payload and secret", () => {
      const payload = '{"event":"user.created"}';
      const secret = "test-secret";

      const sig1 = signer.sign(payload, secret);
      const sig2 = signer.sign(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it("produces different HMAC for different secrets", () => {
      const payload = '{"event":"user.created"}';

      const sig1 = signer.sign(payload, "secret-a");
      const sig2 = signer.sign(payload, "secret-b");

      expect(sig1).not.toBe(sig2);
    });
  });

  describe("verify", () => {
    it("returns true for valid signature", () => {
      const payload = '{"event":"user.created"}';
      const secret = "test-secret";
      const signature = signer.sign(payload, secret);

      expect(signer.verify(payload, secret, signature)).toBe(true);
    });

    it("returns false for invalid signature", () => {
      const payload = '{"event":"user.created"}';
      const secret = "test-secret";

      expect(signer.verify(payload, secret, "invalid-signature")).toBe(false);
    });

    it("returns false for tampered payload", () => {
      const secret = "test-secret";
      const signature = signer.sign('{"event":"user.created"}', secret);

      expect(signer.verify('{"event":"user.deleted"}', secret, signature)).toBe(
        false,
      );
    });
  });
});
