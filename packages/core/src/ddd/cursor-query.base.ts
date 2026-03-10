export abstract class CursorPaginatedQueryBase {
  readonly cursor?: string;
  readonly limit: number;
  readonly direction: "forward" | "backward";

  constructor(props: {
    cursor?: string;
    limit?: number;
    direction?: "forward" | "backward";
  }) {
    this.cursor = props.cursor;
    this.limit = props.limit ?? 20;
    this.direction = props.direction ?? "forward";
  }

  decodeCursor(): { id: string; createdAt: Date } | null {
    if (!this.cursor) return null;
    const decoded = Buffer.from(this.cursor, "base64").toString("utf-8");
    const [id, timestamp] = decoded.split("|");
    return { id, createdAt: new Date(timestamp) };
  }

  static encodeCursor(id: string, createdAt: Date): string {
    return Buffer.from(`${id}|${createdAt.toISOString()}`).toString("base64");
  }
}
