import { CursorPaginatedQueryBase } from "../cursor-query.base";

// Concrete implementation for testing
class TestCursorQuery extends CursorPaginatedQueryBase {}

describe("CursorPaginatedQueryBase", () => {
  it("encodeCursor creates valid base64", () => {
    const date = new Date("2024-01-01T00:00:00.000Z");
    const encoded = CursorPaginatedQueryBase.encodeCursor("abc-123", date);

    expect(encoded).toBeTruthy();
    // Should be valid base64
    expect(Buffer.from(encoded, "base64").toString("utf-8")).toContain(
      "abc-123",
    );
  });

  it("decodeCursor reverses encodeCursor", () => {
    const id = "entity-456";
    const date = new Date("2024-06-15T12:30:00.000Z");
    const encoded = CursorPaginatedQueryBase.encodeCursor(id, date);

    const query = new TestCursorQuery({ cursor: encoded });
    const decoded = query.decodeCursor();

    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(id);
    expect(decoded?.createdAt.toISOString()).toBe(date.toISOString());
  });

  it("decodeCursor returns null when no cursor", () => {
    const query = new TestCursorQuery({});
    expect(query.decodeCursor()).toBeNull();
  });

  it("default limit is 20", () => {
    const query = new TestCursorQuery({});
    expect(query.limit).toBe(20);
  });

  it("default direction is forward", () => {
    const query = new TestCursorQuery({});
    expect(query.direction).toBe("forward");
  });

  it("accepts custom limit and direction", () => {
    const query = new TestCursorQuery({ limit: 50, direction: "backward" });
    expect(query.limit).toBe(50);
    expect(query.direction).toBe("backward");
  });
});
