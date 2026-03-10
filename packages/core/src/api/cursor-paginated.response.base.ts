export class CursorPaginated<T> {
  readonly data: readonly T[];
  readonly cursor: string | null;
  readonly hasMore: boolean;

  constructor(props: { data: T[]; cursor: string | null; hasMore: boolean }) {
    this.data = props.data;
    this.cursor = props.cursor;
    this.hasMore = props.hasMore;
  }
}
