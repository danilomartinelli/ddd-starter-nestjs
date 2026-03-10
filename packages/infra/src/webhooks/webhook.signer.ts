import { createHmac, timingSafeEqual } from "crypto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class WebhookSigner {
  sign(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("hex");
  }

  verify(payload: string, secret: string, signature: string): boolean {
    const expected = this.sign(payload, secret);
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer);
  }
}
