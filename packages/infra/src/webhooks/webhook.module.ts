import { DynamicModule, Module } from "@nestjs/common";
import { WebhookRepository } from "./webhook.repository";
import { WebhookSigner } from "./webhook.signer";
import { WebhookDispatcher } from "./webhook.dispatcher";
import { WebhookOptions, WEBHOOK_OPTIONS } from "./webhook.types";

@Module({})
export class WebhookModule {
  static forRoot(options?: WebhookOptions): DynamicModule {
    return {
      module: WebhookModule,
      global: true,
      providers: [
        {
          provide: WEBHOOK_OPTIONS,
          useValue: options ?? {},
        },
        WebhookRepository,
        WebhookSigner,
        WebhookDispatcher,
      ],
      exports: [WebhookRepository, WebhookSigner, WebhookDispatcher],
    };
  }
}
