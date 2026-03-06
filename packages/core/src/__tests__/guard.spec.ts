import { Guard } from "../guard";

describe("Guard", () => {
  describe("isEmpty", () => {
    it("returns true for null", () => {
      expect(Guard.isEmpty(null)).toBe(true);
    });

    it("returns true for undefined", () => {
      expect(Guard.isEmpty(undefined)).toBe(true);
    });

    it("returns true for empty string", () => {
      expect(Guard.isEmpty("")).toBe(true);
    });

    it("returns true for empty object", () => {
      expect(Guard.isEmpty({})).toBe(true);
    });

    it("returns true for empty array", () => {
      expect(Guard.isEmpty([])).toBe(true);
    });

    it("returns true for array of empty values", () => {
      expect(Guard.isEmpty([undefined, null, ""])).toBe(true);
    });

    it("returns false for non-empty string", () => {
      expect(Guard.isEmpty("hello")).toBe(false);
    });

    it("returns false for number (including 0)", () => {
      expect(Guard.isEmpty(0)).toBe(false);
      expect(Guard.isEmpty(42)).toBe(false);
    });

    it("returns false for boolean (including false)", () => {
      expect(Guard.isEmpty(false)).toBe(false);
      expect(Guard.isEmpty(true)).toBe(false);
    });

    it("returns false for Date", () => {
      expect(Guard.isEmpty(new Date())).toBe(false);
    });

    it("returns false for non-empty object", () => {
      expect(Guard.isEmpty({ key: "value" })).toBe(false);
    });

    it("returns false for non-empty array", () => {
      expect(Guard.isEmpty([1, 2, 3])).toBe(false);
    });
  });

  describe("lengthIsBetween", () => {
    it("returns true for string at exact minimum length", () => {
      expect(Guard.lengthIsBetween("ab", 2, 5)).toBe(true);
    });

    it("returns true for string at exact maximum length", () => {
      expect(Guard.lengthIsBetween("abcde", 2, 5)).toBe(true);
    });

    it("returns true for string within range", () => {
      expect(Guard.lengthIsBetween("abc", 2, 5)).toBe(true);
    });

    it("returns false for string below minimum", () => {
      expect(Guard.lengthIsBetween("a", 2, 5)).toBe(false);
    });

    it("returns false for string above maximum", () => {
      expect(Guard.lengthIsBetween("abcdef", 2, 5)).toBe(false);
    });

    it("works with arrays", () => {
      expect(Guard.lengthIsBetween([1, 2], 2, 5)).toBe(true);
      expect(Guard.lengthIsBetween([1], 2, 5)).toBe(false);
    });

    it("works with numbers (checks digit count)", () => {
      expect(Guard.lengthIsBetween(123, 2, 5)).toBe(true);
      expect(Guard.lengthIsBetween(1, 2, 5)).toBe(false);
    });

    it("throws for empty value", () => {
      expect(() => Guard.lengthIsBetween("", 2, 5)).toThrow(
        "Cannot check length of a value. Provided value is empty",
      );
    });
  });
});
