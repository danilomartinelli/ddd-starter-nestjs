import { Test } from "@nestjs/testing";
import { SecurityModule } from "../security.module";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";

describe("SecurityModule", () => {
  describe("forRoot", () => {
    it("compiles successfully with ThrottlerModule imported", async () => {
      const module = await Test.createTestingModule({
        imports: [SecurityModule.forRoot({ ttl: 60000, limit: 10 })],
      }).compile();

      expect(module).toBeDefined();
    });

    it("provides APP_GUARD token pointing to ThrottlerGuard", () => {
      const dynamicModule = SecurityModule.forRoot({ ttl: 60000, limit: 10 });

      expect(dynamicModule.providers).toEqual(
        expect.arrayContaining([
          { provide: APP_GUARD, useClass: ThrottlerGuard },
        ]),
      );
    });

    it("imports ThrottlerModule with given options", () => {
      const dynamicModule = SecurityModule.forRoot({ ttl: 5000, limit: 20 });

      expect(dynamicModule.imports).toBeDefined();
      expect(dynamicModule.imports!.length).toBe(1);
    });
  });
});
