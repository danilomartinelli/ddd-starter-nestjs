import { Command, CommandProps } from "../ddd/command.base";
import { ArgumentNotProvidedException } from "../exceptions";

class TestCommand extends Command {
  readonly name: string;
  constructor(props: CommandProps<TestCommand>) {
    super(props);
    this.name = props.name;
  }
}

describe("Command", () => {
  it("generates a unique id", () => {
    const cmd = new TestCommand({ name: "test" });
    expect(cmd.id).toBeDefined();
    expect(typeof cmd.id).toBe("string");
  });

  it("accepts a provided id", () => {
    const cmd = new TestCommand({ id: "custom-id", name: "test" });
    expect(cmd.id).toBe("custom-id");
  });

  it("sets metadata with default timestamp", () => {
    const before = Date.now();
    const cmd = new TestCommand({ name: "test" });
    expect(cmd.metadata.timestamp).toBeGreaterThanOrEqual(before);
    expect(cmd.metadata.correlationId).toBe("test-request-id");
  });

  it("accepts custom metadata", () => {
    const cmd = new TestCommand({
      name: "test",
      metadata: {
        correlationId: "custom-corr",
        causationId: "custom-cause",
        timestamp: 9999999,
        userId: "user-1",
      },
    });
    expect(cmd.metadata.correlationId).toBe("custom-corr");
    expect(cmd.metadata.causationId).toBe("custom-cause");
  });

  it("preserves custom properties", () => {
    const cmd = new TestCommand({ name: "do-something" });
    expect(cmd.name).toBe("do-something");
  });

  it("throws for empty props", () => {
    expect(() => new TestCommand(null as any)).toThrow(
      ArgumentNotProvidedException,
    );
  });
});
