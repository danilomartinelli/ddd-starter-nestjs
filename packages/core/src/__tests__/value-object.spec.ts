import { ValueObject } from "../ddd/value-object.base";
import { ArgumentNotProvidedException } from "../exceptions";

// Test double: multi-property VO
interface TestAddressProps {
  street: string;
  city: string;
}

class TestAddress extends ValueObject<TestAddressProps> {
  protected validate(props: TestAddressProps): void {
    // no-op for base class testing
  }
}

// Test double: domain primitive VO (single value)
class TestEmail extends ValueObject<string> {
  protected validate(props: { value: string }): void {
    // no-op for base class testing
  }
}

describe("ValueObject", () => {
  describe("construction", () => {
    it("creates a multi-property value object", () => {
      const address = new TestAddress({
        street: "123 Main",
        city: "Springfield",
      });
      expect(address.unpack()).toEqual({
        street: "123 Main",
        city: "Springfield",
      });
    });

    it("creates a domain primitive value object", () => {
      const email = new TestEmail({ value: "test@example.com" });
      expect(email.unpack()).toBe("test@example.com");
    });

    it("throws when props are empty (null)", () => {
      expect(() => new TestAddress(null as any)).toThrow(
        ArgumentNotProvidedException,
      );
    });

    it("throws when props are undefined", () => {
      expect(() => new TestAddress(undefined as any)).toThrow(
        ArgumentNotProvidedException,
      );
    });

    it("throws when domain primitive value is empty", () => {
      expect(() => new TestEmail({ value: "" })).toThrow(
        ArgumentNotProvidedException,
      );
    });
  });

  describe("equality", () => {
    it("two VOs with same props are equal", () => {
      const a = new TestAddress({ street: "123 Main", city: "Springfield" });
      const b = new TestAddress({ street: "123 Main", city: "Springfield" });
      expect(a.equals(b)).toBe(true);
    });

    it("two VOs with different props are not equal", () => {
      const a = new TestAddress({ street: "123 Main", city: "Springfield" });
      const b = new TestAddress({ street: "456 Oak", city: "Shelbyville" });
      expect(a.equals(b)).toBe(false);
    });

    it("returns false for null", () => {
      const a = new TestAddress({ street: "123 Main", city: "Springfield" });
      expect(a.equals(null as any)).toBe(false);
    });

    it("returns false for undefined", () => {
      const a = new TestAddress({ street: "123 Main", city: "Springfield" });
      expect(a.equals(undefined)).toBe(false);
    });
  });

  describe("unpack", () => {
    it("returns frozen props for multi-property VO", () => {
      const address = new TestAddress({
        street: "123 Main",
        city: "Springfield",
      });
      const unpacked = address.unpack();
      expect(Object.isFrozen(unpacked)).toBe(true);
    });

    it("returns raw value for domain primitive", () => {
      const email = new TestEmail({ value: "test@example.com" });
      expect(email.unpack()).toBe("test@example.com");
    });
  });

  describe("isValueObject", () => {
    it("returns true for ValueObject instances", () => {
      const address = new TestAddress({
        street: "123 Main",
        city: "Springfield",
      });
      expect(ValueObject.isValueObject(address)).toBe(true);
    });

    it("returns false for plain objects", () => {
      expect(ValueObject.isValueObject({ street: "123 Main" })).toBe(false);
    });
  });
});
