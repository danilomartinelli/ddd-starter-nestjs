import { Test } from "@nestjs/testing";
import { LoggingModule } from "../logging.module";
import { Logger } from "nestjs-pino";

describe("LoggingModule", () => {
  describe("forRoot", () => {
    it("provides the Pino Logger", async () => {
      const module = await Test.createTestingModule({
        imports: [LoggingModule.forRoot({ level: "info" })],
      }).compile();

      const logger = module.get(Logger);
      expect(logger).toBeDefined();
    });

    it("provides the Pino Logger with default options", async () => {
      const module = await Test.createTestingModule({
        imports: [LoggingModule.forRoot()],
      }).compile();

      const logger = module.get(Logger);
      expect(logger).toBeDefined();
    });
  });
});
