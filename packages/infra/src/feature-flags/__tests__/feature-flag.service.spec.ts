import { FeatureFlagService } from "../feature-flag.service";

describe("FeatureFlagService", () => {
  let service: FeatureFlagService;

  describe("with configured flags", () => {
    beforeEach(() => {
      service = new FeatureFlagService({
        flags: {
          ENABLED_FLAG: true,
          DISABLED_FLAG: false,
        },
      });
    });

    it("returns true for enabled flag in options", () => {
      expect(service.isEnabled("ENABLED_FLAG")).toBe(true);
    });

    it("returns false for disabled flag in options", () => {
      expect(service.isEnabled("DISABLED_FLAG")).toBe(false);
    });
  });

  describe("env var fallback", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      service = new FeatureFlagService({ flags: {} });
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("falls back to env var when not in options", () => {
      process.env.FEATURE_MY_FLAG = "true";
      expect(service.isEnabled("MY_FLAG")).toBe(true);
    });

    it("returns false when flag not found anywhere", () => {
      expect(service.isEnabled("UNKNOWN_FLAG")).toBe(false);
    });
  });
});
