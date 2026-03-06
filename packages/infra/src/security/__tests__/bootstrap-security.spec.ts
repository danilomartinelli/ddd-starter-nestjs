import { bootstrapSecurity } from "../bootstrap-security";
import { INestApplication } from "@nestjs/common";

describe("bootstrapSecurity", () => {
  let app: INestApplication;

  beforeEach(() => {
    app = {
      use: jest.fn(),
      enableCors: jest.fn(),
    } as unknown as INestApplication;
  });

  it("calls app.use with helmet middleware", () => {
    bootstrapSecurity(app);
    expect(app.use).toHaveBeenCalledTimes(1);
    expect(app.use).toHaveBeenCalledWith(expect.any(Function));
  });

  it("enables CORS with provided origins", () => {
    bootstrapSecurity(app, { corsOrigins: ["http://localhost:3000"] });
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: ["http://localhost:3000"],
      credentials: true,
    });
  });

  it("defaults to empty origins and credentials true", () => {
    bootstrapSecurity(app);
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: [],
      credentials: true,
    });
  });

  it("respects corsCredentials option", () => {
    bootstrapSecurity(app, {
      corsOrigins: ["http://example.com"],
      corsCredentials: false,
    });
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: ["http://example.com"],
      credentials: false,
    });
  });
});
