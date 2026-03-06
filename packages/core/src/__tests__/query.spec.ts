import { PaginatedQueryBase, PaginatedParams } from "../ddd/query.base";

class TestQuery extends PaginatedQueryBase {
  readonly filter?: string;
  constructor(props: PaginatedParams<TestQuery>) {
    super(props);
    this.filter = props.filter;
  }
}

describe("PaginatedQueryBase", () => {
  it("uses default limit of 20 when not provided", () => {
    const query = new TestQuery({});
    expect(query.limit).toBe(20);
  });

  it("accepts custom limit", () => {
    const query = new TestQuery({ limit: 50 });
    expect(query.limit).toBe(50);
  });

  it("calculates offset from page and limit", () => {
    const query = new TestQuery({ page: 2, limit: 10 });
    expect(query.offset).toBe(20);
  });

  it("defaults to page 0 and offset 0", () => {
    const query = new TestQuery({});
    expect(query.page).toBe(0);
    expect(query.offset).toBe(0);
  });

  it("uses default orderBy when not provided", () => {
    const query = new TestQuery({});
    expect(query.orderBy).toEqual({ field: true, param: "desc" });
  });

  it("accepts custom orderBy", () => {
    const query = new TestQuery({ orderBy: { field: "name", param: "asc" } });
    expect(query.orderBy).toEqual({ field: "name", param: "asc" });
  });

  it("preserves custom properties", () => {
    const query = new TestQuery({ filter: "active" });
    expect(query.filter).toBe("active");
  });
});
